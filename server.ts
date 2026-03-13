
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("[Server] Initializing...");
  const app = express();
  const PORT = 3000;
  
  console.log(`[Server] Starting in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`[Server] Port: ${PORT}`);
  console.log(`[Server] GAS_API_URL: ${process.env.GAS_API_URL ? 'Configured' : 'Using Fallback'}`);

  // Request Logger
  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  
  // CORS configuration
  app.use(cors({
    origin: '*', // Allow all origins in dev/preview
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  // Explicit OPTIONS handler for preflight
  app.options("*all", cors());
  
  // JSON Parse Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
        console.error('[Server] JSON Parse Error:', err);
        return res.status(400).json({ status: 'error', message: 'Invalid JSON body' });
    }
    next();
  });

  // API routes go here
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      gasUrl: process.env.GAS_API_URL ? "Set" : "Not Set (Using Default)"
    });
  });

  // Proxy to Google Apps Script
  app.post("/api/proxy", async (req, res) => {
    console.log(`[Proxy] Incoming request for action: ${req.body?.action}`);
    
    try {
      if (!req.body) {
         console.error("[Proxy Error] Missing request body");
         return res.status(400).json({ status: 'error', message: "Missing request body" });
      }

      const { action, payload, apiUrl } = req.body;
      
      // Sanitize and validate target URL
      let targetUrl = (apiUrl || process.env.GAS_API_URL || "https://script.google.com/macros/s/AKfycbyBGXKUFi7okwEX5T7wueF798lgvXGXCjVUOshZAF47piQJdiI5u3r4LP0uFtR2eWpq/exec").trim();

      if (!targetUrl || !targetUrl.startsWith('http')) {
        console.error("[Proxy Error] Invalid target URL:", targetUrl);
        return res.status(400).json({ status: 'error', message: "Invalid API URL configuration. Please check GAS_API_URL." });
      }

      console.log(`[Proxy] Forwarding ${action} to: ${targetUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        console.log(`[Proxy] Fetching from GAS for action: ${action}...`);
        const response = await fetch(targetUrl, {
          method: 'POST',
          body: JSON.stringify({ action, payload: payload || {} }),
          headers: {
            "Content-Type": "text/plain;charset=utf-8", 
          },
          redirect: "follow",
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log(`[Proxy] GAS Response Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        
        if (!response.ok) {
          console.error(`[Proxy Error] GAS returned ${response.status}: ${response.statusText}`);
          return res.status(response.status).json({ 
            status: 'error', 
            message: `GAS Server Error (${response.status}): ${response.statusText}`,
            raw: text.substring(0, 200)
          });
        }

        try {
          // Handle GAS redirecting to HTML login page or error page
          const trimmedText = text.trim();
          if (trimmedText.startsWith("<!DOCTYPE html") || trimmedText.startsWith("<html")) {
               console.error("[Proxy Error] Received HTML response from GAS");
               const titleMatch = trimmedText.match(/<title>(.*?)<\/title>/i);
               const title = titleMatch ? titleMatch[1] : "HTML Response";
               
               let helpfulMessage = `Received HTML ("${title}") from Google instead of JSON.`;
               
               if (title.includes("Google Accounts") || title.includes("Sign in")) {
                   helpfulMessage = "Google is asking for login. Please ensure the Google Apps Script is deployed with 'Who has access: Anyone' (NOT 'Anyone with a Google account').";
               } else if (title.includes("Error") || title.includes("Not Found")) {
                   helpfulMessage = `Google returned an error page: "${title}". Check if the Script URL is correct and the script is deployed as a Web App.`;
               } else if (title.includes("Script Error")) {
                   helpfulMessage = "Google Apps Script execution error. Check your script logs or ensure all required permissions are granted.";
               } else if (title.includes("Authorization Required")) {
                   helpfulMessage = "Script needs authorization. Open the script editor and run any function to trigger the authorization prompt.";
               }
               
               console.error(`[Proxy Error] Detailed HTML Error: ${helpfulMessage}`);
               console.error(`[Proxy Error] Full HTML Response (first 1000 chars): ${trimmedText.substring(0, 1000)}`);
               throw new Error(helpfulMessage);
          }

          if (!trimmedText) {
              console.error("[Proxy Error] Empty response from GAS");
              throw new Error("Empty response from Google Apps Script. Check if your script's doPost function is returning a valid ContentService response.");
          }

          const json = JSON.parse(text);
          console.log(`[Proxy] Successfully parsed JSON for action: ${action}`);
          res.json(json);
        } catch (e: any) {
          console.error("[Proxy Error] Failed to process GAS response:", e.message);
          res.status(500).json({ 
            status: 'error', 
            message: e.message || "Invalid response from Google Apps Script.", 
            raw: text.substring(0, 500) 
          });
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error("[Proxy Error] Request timed out");
          throw new Error("Request to Google Apps Script timed out after 60 seconds.");
        }
        console.error("[Proxy Error] Fetch to GAS failed:", fetchError.message);
        throw fetchError;
      }
    } catch (error: any) {
      console.error("[Proxy Error] Outer catch:", error.message);
      res.status(500).json({ 
        status: 'error', 
        message: `Proxy Fetch Failed: ${error.message}. Check your internet connection or the GAS URL.`,
        details: error.stack
      });
    }
  });

  // Fallback for any other /api/* routes to prevent SPA fallback from returning HTML
  app.all("/api/*all", (req, res) => {
    console.warn(`[Server] Unhandled API route: ${req.method} ${req.url}`);
    res.status(404).json({ status: 'error', message: `API route not found: ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`[Server] GAS_API_URL: ${process.env.GAS_API_URL ? 'Configured' : 'Not Configured (using fallback)'}`);
  });
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server Error] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Server Error] Uncaught Exception:', err);
});

startServer();
