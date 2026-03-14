
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  console.log(`[Server] Starting in ${process.env.NODE_ENV || 'development'} mode`);

  // Request Logger
  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  
  // CORS configuration
  app.use(cors({
    origin: true, // Reflect the request origin
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
  }));
  
  // Explicit OPTIONS handler for preflight
  app.options('*all', cors());
  
  // JSON Parse Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
        console.error('[Server] JSON Parse Error:', err.message);
        return res.status(400).json({ status: 'error', message: 'Invalid JSON body' });
    }
    next();
  });

  // API routes go here
  app.get("/api/health", (req, res) => {
    console.log('[Server] Health check requested (GET)');
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      gasUrl: process.env.GAS_API_URL ? "Configured" : "Using Fallback",
      nodeVersion: process.version
    });
  });

  app.post("/api/health", (req, res) => {
    console.log('[Server] Health check requested (POST)');
    res.json({ status: "ok", method: "POST" });
  });

  // Proxy to Google Apps Script
  app.post("/api/proxy", async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[Proxy][${requestId}] Request: ${req.method} ${req.url}`);
    
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
         console.error(`[Proxy Error][${requestId}] Missing or empty request body`);
         return res.status(400).json({ status: 'error', message: "Missing or empty request body" });
      }

      const { action, payload, apiUrl } = req.body;
      
      if (!action) {
        console.error(`[Proxy Error][${requestId}] Missing action in request body`);
        return res.status(400).json({ status: 'error', message: "Missing action in request body" });
      }
      
      // Sanitize and validate target URL
      const fallbackUrl = "https://script.google.com/macros/s/AKfycbyBGXKUFi7okwEX5T7wueF798lgvXGXCjVUOshZAF47piQJdiI5u3r4LP0uFtR2eWpq/exec";
      let targetUrl = (apiUrl || process.env.GAS_API_URL || fallbackUrl).trim();

      if (!targetUrl || !targetUrl.startsWith('http')) {
        console.error(`[Proxy Error][${requestId}] Invalid target URL:`, targetUrl);
        return res.status(400).json({ status: 'error', message: "Invalid API URL configuration." });
      }

      console.log(`[Proxy][${requestId}] Action: ${action} -> ${targetUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
          console.warn(`[Proxy][${requestId}] Timing out request for action: ${action}`);
          controller.abort();
      }, 60000); // 60 second timeout

      try {
        console.log(`[Proxy][${requestId}] Fetching from GAS for action: ${action}...`);
        
        // Use global fetch (Node 18+)
        const response = await fetch(targetUrl, {
          method: 'POST',
          body: JSON.stringify({ action, payload: payload || {} }),
          headers: {
            "Content-Type": "application/json", 
            "User-Agent": "Pintu-Kuliah-Proxy/1.0"
          },
          redirect: "follow",
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log(`[Proxy][${requestId}] GAS Response Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        
        if (!response.ok) {
          console.error(`[Proxy Error][${requestId}] GAS returned ${response.status}: ${response.statusText}`);
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
               console.error(`[Proxy Error][${requestId}] Received HTML response from GAS`);
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
               
               console.error(`[Proxy Error][${requestId}] Detailed HTML Error: ${helpfulMessage}`);
               return res.status(500).json({ status: 'error', message: helpfulMessage });
          }

          if (!trimmedText) {
              console.error(`[Proxy Error][${requestId}] Empty response from GAS`);
              return res.status(500).json({ status: 'error', message: "Empty response from Google Apps Script." });
          }

          const json = JSON.parse(text);
          console.log(`[Proxy][${requestId}] Successfully parsed JSON for action: ${action}`);
          res.json(json);
        } catch (e: any) {
          console.error(`[Proxy Error][${requestId}] Failed to process GAS response:`, e.message);
          res.status(500).json({ 
            status: 'error', 
            message: "Invalid response from Google Apps Script: " + e.message, 
            raw: text.substring(0, 500) 
          });
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error(`[Proxy Error][${requestId}] Request timed out`);
          return res.status(504).json({ status: 'error', message: "Request to Google Apps Script timed out." });
        }
        console.error(`[Proxy Error][${requestId}] Fetch to GAS failed:`, fetchError.message);
        return res.status(502).json({ status: 'error', message: `Fetch to GAS failed: ${fetchError.message}` });
      }
    } catch (error: any) {
      console.error(`[Proxy Error][${requestId}] Outer catch:`, error.message);
      res.status(500).json({ 
        status: 'error', 
        message: `Internal Proxy Error: ${error.message}`,
        details: error.stack
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log('[Server] Initializing Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      base: "/",
    });
    app.use(vite.middlewares);
    console.log('[Server] Vite middleware initialized');
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Hanya jalankan listen jika tidak di lingkungan Vercel
  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`[Server] GAS_API_URL: ${process.env.GAS_API_URL ? 'Configured' : 'Not Configured (using fallback)'}`);
    });
  }

  return app;
}

const appPromise = startServer();

// Export app untuk Vercel
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server Error] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Server Error] Uncaught Exception:', err);
});
