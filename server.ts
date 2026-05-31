import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import authRouter from "./src/server/auth";
import auditRouter from "./src/server/auditRouter";
import { initFirebaseSecrets } from "./src/server/secrets";

dotenv.config();

async function startServer() {
  await initFirebaseSecrets();
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: "50mb" }));

  app.use("/api/auth", authRouter);
  app.use("/api/admin", authRouter);
  app.use("/api", auditRouter);

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      domain: req.headers.host,
      forwardedHost: req.headers['x-forwarded-host'] || req.headers['x-original-host'] || null,
      headers: req.headers
    });
  });

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
      return res.status(500).json({ error: error?.message || "reCAPTCHA verification failed" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();