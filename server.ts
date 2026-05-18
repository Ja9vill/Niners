import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

import * as SheetsBackend from "./src/server/sheetsBackend";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing for API requests
  app.use(express.json({ limit: '50mb' }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- SHEET-BACKED AUTH ---
  app.post("/api/sheets/auth", async (req, res) => {
    const result = await SheetsBackend.handleAuthRoute(req);
    res.status(result.status).json(result.data);
  });

  // --- ROSTER MANAGEMENT ---
  app.get("/api/sheets/roster", async (req, res) => {
    const result = await SheetsBackend.handleRosterRoute();
    res.status(result.status).json(result.data);
  });

  // --- LOGS (FEEDS & VERSION CONTROL) ---
  app.post("/api/sheets/logs/activity", async (req, res) => {
    const result = await SheetsBackend.handleActivityLogRoute(req);
    res.status(result.status).json(result.data);
  });

  app.get("/api/sheets/logs/activity", async (req, res) => {
    const result = await SheetsBackend.handleGetActivityLogsRoute();
    res.status(result.status).json(result.data);
  });

  app.post("/api/sheets/logs/version", async (req, res) => {
    const result = await SheetsBackend.handleVersionLogRoute(req);
    res.status(result.status).json(result.data);
  });

  // --- FINANCIAL DATA MANAGEMENT ---
  app.get("/api/sheets/commissions", async (req, res) => {
    const result = await SheetsBackend.handleCommissionsRoute(req);
    res.status(result.status).json(result.data);
  });

  app.post("/api/sheets/commissions/save", async (req, res) => {
    const result = await SheetsBackend.handleSaveCommissionsRoute(req);
    res.status(result.status).json(result.data);
  });

  app.delete("/api/sheets/commissions/delete", async (req, res) => {
    const result = await SheetsBackend.handleDeleteCommissionsRoute(req);
    res.status(result.status).json(result.data);
  });

  app.post("/api/sheets/roster/save", async (req, res) => {
    const result = await SheetsBackend.handleSaveRosterRoute(req);
    res.status(result.status).json(result.data);
  });

  app.post("/api/sheets/roster/update", async (req, res) => {
    const result = await SheetsBackend.handleUpdateHostRoute(req);
    res.status(result.status).json(result.data);
  });

  app.get("/api/sheets/notes", async (req, res) => {
    const result = await SheetsBackend.handleGetNotesRoute(req);
    res.status(result.status).json(result.data);
  });

  app.post("/api/sheets/notes/save", async (req, res) => {
    const result = await SheetsBackend.handleSaveNoteRoute(req);
    res.status(result.status).json(result.data);
  });

  app.get("/api/sheets/resets", async (req, res) => {
    const result = await SheetsBackend.handleGetResetsRoute();
    res.status(result.status).json(result.data);
  });

  app.post("/api/sheets/resets/create", async (req, res) => {
    const result = await SheetsBackend.handleCreateResetRequestRoute(req);
    res.status(result.status).json(result.data);
  });

  app.post("/api/sheets/resets/resolve", async (req, res) => {
    const result = await SheetsBackend.handleResolveResetRequestRoute(req);
    res.status(result.status).json(result.data);
  });

  app.post("/api/extract-mastersheet", async (req, res) => {
    try {
      const { fileData, mimeType, fileName } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `
        Extract data from this Poppo Live Mastersheet report image or PDF.
        Identify the table and extract all rows into a JSON array.
        
        The columns to look for are:
        - ID (numeric Poppo ID)
        - Nickname (Host name)
        - Live duration (format HH:MM:SS)
        - Party host duration (or Video Duration)
        - Total earnings of points
        - Agent commission (or agentweb_commission_earning)
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

        Mapping instructions:
        - Map "ID" to "poppo_id" (string)
        - Map "Nickname" to "poppo_name"
        - Map "Live duration" to "live_duration"
        - Map "Party host duration" or "Video Duration" to "video_duration"
        - Map "Total earnings of points" to "total_points"
        - Map "Agent commission" to "agentweb_commission_earning"
        - Map "Live earnings" to "live_earnings"
        - Map "Party Earnings" to "video_earnings"
        - Include other fields as named above if present.
        - Ensure all numeric values are numbers, not strings.
        - If a value is missing, use 0 for numbers and empty string for text.

        Return ONLY the raw JSON array of objects.
      `;

      // Retry mechanism for 503 errors
      let attempts = 0;
      const maxAttempts = 3;
      let extractedData = [];
      
      while (attempts < maxAttempts) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview", 
            contents: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: fileData
                }
              },
              { text: prompt }
            ],
            config: {
              responseMimeType: "application/json"
            }
          });
          const textContent = response.text || "[]";
          extractedData = JSON.parse(textContent);
          break;
        } catch (err: any) {
          attempts++;
          if (err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('high demand')) {
            if (attempts >= maxAttempts) throw err;
            console.log(`Gemini Busy (503). Retry attempt ${attempts}...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
            continue;
          }
          throw err;
        }
      }

      res.json({ data: extractedData });
    } catch (error: any) {
      console.error("Extraction error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Example Gemini endpoint (proxying to server-side to hide the key)
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
            'User-Agent': 'aistudio-build',
          }
        }
      });
      const response = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview", 
        contents: message 
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message });
    }
  });

// reCAPTCHA Enterprise verification endpoint
app.post("/api/verify-recaptcha", async (req, res) => {
  try {
    const { token, action } = req.body;
    if (!token) {
      return res.status(400).json({ error: "No reCAPTCHA token provided" });
    }
    const projectId = "gen-lang-client-0222945352";
    const siteKey = "6LfqX-wsAAAAAGeVHsRVuRvGgnT5e_ubHVNZQbvj";
    const apiKey = process.env.GOOGLE_API_KEY || "";
    const verifyUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`;
    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: { token, expectedAction: action || "login", siteKey },
      }),
    });
    const data = await response.json();
    const score = data?.riskAnalysis?.score ?? 0;
    res.json({ success: true, score, valid: score >= 0.5 });
  } catch (error: any) {
    console.error("reCAPTCHA verification error:", error);
    res.status(500).json({ error: "reCAPTCHA verification failed" });
  }
});

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
