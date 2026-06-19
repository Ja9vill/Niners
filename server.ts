import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { getMessaging } from "firebase-admin/messaging";
import authRouter, { getAdminFirestore, getFirebaseAdminApp } from "./src/server/auth";
import auditRouter from "./src/server/auditRouter";
import { google } from "googleapis";
import { initFirebaseSecrets } from "./src/server/secrets";
import { logSystemEvent } from "./src/server/Logger";
import net from "net";

dotenv.config();

/** Returns the first available TCP port starting from `start`. */
function findFreePort(start: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(start, "0.0.0.0", () => {
      const addr = server.address() as net.AddressInfo;
      server.close(() => resolve(addr.port));
    });
    server.on("error", () => resolve(findFreePort(start + 1)));
  });
}

async function startServer() {
  await initFirebaseSecrets();
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/admin", authRouter);

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      domain: req.headers.host,
      forwardedHost: req.headers['x-forwarded-host'] || req.headers['x-original-host'] || null,
      headers: req.headers
    });
  });

  // Proxy image upload to Google Cloud Storage using service account credentials
  // This completely bypasses Firebase CORS & Storage Rules limitations
  app.post("/api/upload-profile-photo", async (req, res) => {
    try {
      const { fileData, fileName, contentType } = req.body;
      if (!fileData || !fileName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET;

      if (!privateKey || !clientEmail || !bucketName) {
        return res.status(500).json({ error: "Missing Firebase service account credentials" });
      }

      // Authenticate with Google APIs using service account
      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/devstorage.read_write']
      });
      const tokenResponse = await auth.getAccessToken();
      const accessToken = tokenResponse.token;

      if (!accessToken) throw new Error("Failed to obtain GCS access token");

      // Strip base64 data URI prefix and convert to buffer
      const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const objectPath = `profile_photos/${fileName}`;

      // Upload to Google Cloud Storage via REST API
      const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucketName)}/o?uploadType=media&name=${encodeURIComponent(objectPath)}&predefinedAcl=publicRead`;

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': contentType || 'image/jpeg',
          'Content-Length': String(buffer.length),
        },
        body: buffer
      });

      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text();
        throw new Error(`GCS upload failed (${uploadResponse.status}): ${errText}`);
      }

      // Construct public URL
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media`;

      return res.json({ url: publicUrl });
    } catch (error: any) {
      console.error("Profile photo proxy upload error:", error);
      return res.status(500).json({ error: error?.message || "Upload failed" });
    }
  });

  // Register audit router AFTER specific routes so it doesn't intercept them
  app.use("/api", auditRouter);

  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: message,
        config: {
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT" as any,
              threshold: "BLOCK_LOW_AND_ABOVE" as any,
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH" as any,
              threshold: "BLOCK_LOW_AND_ABOVE" as any,
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any,
              threshold: "BLOCK_LOW_AND_ABOVE" as any,
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any,
              threshold: "BLOCK_LOW_AND_ABOVE" as any,
            },
          ],
        },
      });

      return res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      logSystemEvent({
        severity: 'Error',
        actionDescription: 'Gemini API Chat failed',
        stackTrace: error?.stack || error?.message
      });
      return res.status(500).json({ error: error?.message || "Chat failed" });
    }
  });

  app.post("/api/extract-mastersheet", async (req, res) => {
    try {
      const { fileData, mimeType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      if (!fileData || !mimeType) {
        return res.status(400).json({ error: "fileData and mimeType are required" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `
Extract data from this Poppo Live Mastersheet report image or PDF.
Identify the table and extract all rows into a JSON array.

The columns to look for are:
- ID
- Nickname
- Live duration
- Party host duration or Video Duration
- Total earnings of points
- Agent commission or agentweb_commission_earning
- Live earnings
- Party Earnings
- Private chat
- Tips
- Platform reward
- Other Earn
- Platform holding
- Super Salary
- Super Rank
- Level

Map them to:
- poppo_id
- poppo_name
- live_duration
- video_duration
- total_points
- agentweb_commission_earning
- live_earnings
- video_earnings
- private_chat
- tips
- platform_reward
- other_earn
- platform_holding
- super_salary
- super_rank
- level

Rules:
- Numeric values must be numbers, not strings.
- Missing numeric values should be 0.
- Missing text values should be "".
- Return ONLY the raw JSON array.
      `;

      let attempts = 0;
      let extractedData: any[] = [];

      while (attempts < 3) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                inlineData: {
                  mimeType,
                  data: fileData,
                },
              },
              { text: prompt },
            ],
            config: {
              responseMimeType: "application/json",
              safetySettings: [
                {
                  category: "HARM_CATEGORY_HARASSMENT" as any,
                  threshold: "BLOCK_LOW_AND_ABOVE" as any,
                },
                {
                  category: "HARM_CATEGORY_HATE_SPEECH" as any,
                  threshold: "BLOCK_LOW_AND_ABOVE" as any,
                },
                {
                  category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any,
                  threshold: "BLOCK_LOW_AND_ABOVE" as any,
                },
                {
                  category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any,
                  threshold: "BLOCK_LOW_AND_ABOVE" as any,
                },
              ],
            },
          });

          extractedData = JSON.parse(response.text || "[]");
          break;
        } catch (err: any) {
          attempts += 1;

          const maybeRetryable =
            err?.status === 503 ||
            String(err?.message || "").includes("503") ||
            String(err?.message || "").toLowerCase().includes("high demand");

          if (maybeRetryable && attempts < 3) {
            await new Promise((resolve) => setTimeout(resolve, 2000 * attempts));
            continue;
          }

          throw err;
        }
      }

      return res.json({ data: extractedData });
    } catch (error: any) {
      console.error("Extraction error:", error);
      logSystemEvent({
        severity: 'Error',
        actionDescription: 'Mastersheet Extraction failed',
        stackTrace: error?.stack || error?.message
      });
      return res.status(500).json({ error: error?.message || "Extraction failed" });
    }
  });

  app.post("/api/verify-recaptcha", async (req, res) => {
    try {
      const { token, action } = req.body;

      if (!token) {
        return res.status(400).json({ error: "No reCAPTCHA token provided" });
      }

      const projectId = process.env.FIREBASE_PROJECT_ID || "nine-dashboard-733997";
      const siteKey = "6LfqX-wsAAAAAGeVHsRVuRvGgnT5e_ubHVNZQbvj";
      const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";

      if (!apiKey) {
        return res.status(500).json({ error: "GOOGLE_API_KEY is not configured" });
      }

      const verifyUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`;

      const response = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: {
            token,
            expectedAction: action || "login",
            siteKey,
          },
        }),
      });

      const data = await response.json();
      const score = data?.riskAnalysis?.score ?? 0;

      return res.json({
        success: true,
        score,
        valid: score >= 0.5,
        raw: data,
      });
    } catch (error: any) {
      console.error("reCAPTCHA verification error:", error);
      logSystemEvent({
        severity: 'Error',
        actionDescription: 'reCAPTCHA verification failed',
        stackTrace: error?.stack || error?.message
      });
      return res.status(500).json({ error: error?.message || "reCAPTCHA verification failed" });
    }
  });

  app.post("/api/notify", async (req, res) => {
    try {
      const { targetPoppoId, title, body } = req.body;
      if (!targetPoppoId || !title || !body) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const db = getAdminFirestore();
      const userDoc = await db.collection('users').doc(targetPoppoId).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }

      const userData = userDoc.data();
      const fcmTokens = userData?.fcmTokens || [];

      if (fcmTokens.length === 0) {
        return res.status(404).json({ error: "User has no registered devices for notifications" });
      }

      const messaging = getMessaging(getFirebaseAdminApp());
      
      const message = {
        notification: {
          title,
          body
        },
        tokens: fcmTokens
      };

      const response = await messaging.sendEachForMulticast(message);
      
      // Optional: Cleanup invalid tokens based on response.responses
      
      return res.json({ success: true, successCount: response.successCount, failureCount: response.failureCount });
    } catch (error: any) {
      console.error("FCM Notify error:", error);
      return res.status(500).json({ error: error?.message || "Notification dispatch failed" });
    }
  });

  const isDev = process.env.NODE_ENV !== 'production';
  console.log(`\n🔧 Mode: ${isDev ? 'DEVELOPMENT (Vite middleware)' : 'PRODUCTION (static dist)'}\n`);

  if (isDev) {
    // Auto-find a free HMR port so Vite never crashes on 24678 being in use
    const hmrPort = await findFreePort(24678);
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { port: hmrPort } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Auto-find a free main port — never crash on EADDRINUSE
  const freePort = await findFreePort(PORT);
  if (freePort !== PORT) {
    console.warn(`⚠️  Port ${PORT} is in use — using port ${freePort} instead.`);
  }
  app.listen(freePort, "0.0.0.0", () => {
    console.log(`\n✅ Dev server running at: \x1b[36mhttp://localhost:${freePort}\x1b[0m\n`);
  });
}

startServer();