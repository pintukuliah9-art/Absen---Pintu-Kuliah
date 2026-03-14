
import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

app.use(express.json({ limit: '50mb' }));

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));

// Explicit OPTIONS handler for preflight
app.options('*all', cors());

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production',
    gasUrl: process.env.GAS_API_URL ? "Configured" : "Using Fallback"
  });
});

// Proxy to Google Apps Script
app.post("/api/proxy", async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
       return res.status(400).json({ status: 'error', message: "Missing or empty request body" });
    }

    const { action, payload, apiUrl } = req.body;
    
    if (!action) {
      return res.status(400).json({ status: 'error', message: "Missing action in request body" });
    }
    
    const fallbackUrl = "https://script.google.com/macros/s/AKfycbyBGXKUFi7okwEX5T7wueF798lgvXGXCjVUOshZAF47piQJdiI5u3r4LP0uFtR2eWpq/exec";
    let targetUrl = (apiUrl || process.env.GAS_API_URL || fallbackUrl).trim();

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).json({ status: 'error', message: "Invalid API URL configuration." });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ action, payload }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const text = await response.text();
      
      try {
        const data = JSON.parse(text);
        res.status(response.status).json(data);
      } catch (e) {
        res.status(response.status).send(text);
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      res.status(500).json({ status: 'error', message: fetchError.message });
    }
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default app;
