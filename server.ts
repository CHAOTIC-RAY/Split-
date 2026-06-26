import express from "express";
import path from "path";
import axios from "axios";
import { createServer as createViteServer } from "vite";
import Tesseract from "tesseract.js";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Gemini
  const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Middleware for parsing large JSON payloads (base64 images)
  app.use(express.json({ limit: '50mb' }));

  // Robust Proxy for Models (Hugging Face, GitHub, Google Storage)
  app.get("/api/proxy/*", async (req, res) => {
    try {
      const fullPath = req.params[0];
      let targetUrl = "";
      
      if (fullPath.startsWith("https/")) {
        targetUrl = "https://" + fullPath.substring(6);
      } else if (fullPath.startsWith("http/")) {
        targetUrl = "http://" + fullPath.substring(5);
      } else if (fullPath.includes("githubusercontent.com") || fullPath.includes("raw.githubusercontent.com")) {
        targetUrl = fullPath.startsWith("http") ? fullPath : `https://${fullPath}`;
      } else if (fullPath.includes("storage.googleapis.com")) {
        targetUrl = fullPath.startsWith("http") ? fullPath : `https://${fullPath}`;
      } else {
        // Default to Hugging Face if no provider specified
        targetUrl = `https://huggingface.co/${fullPath}`;
      }
      
      const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      targetUrl += queryString;

      console.log(`[Proxy] Target: ${targetUrl}`);
      
      const hasRange = !!req.headers.range;
      
      const response = await axios({
        method: 'get',
        url: targetUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...(hasRange ? { 'Range': req.headers.range } : {})
        },
        maxRedirects: 10,
        validateStatus: (status) => status < 400 || status === 206
      });

      // Forward relevant headers
      const headersToForward = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'content-encoding',
        'last-modified',
        'etag',
        'cache-control'
      ];

      headersToForward.forEach(h => {
        const val = response.headers[h];
        if (val) res.setHeader(h, val);
      });

      // Ensure CORS and caching headers for Cache API
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Expose-Headers', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      
      res.status(response.status);
      response.data.pipe(res);
    } catch (error: any) {
      console.error("[Proxy Error]", error.message);
      const status = error.response?.status || 500;
      res.status(status).send(error.message);
    }
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/scan", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No image provided" });
      }

      // We use tesseract.js on the server to prevent frontend OOM crashes
      // Extract base64 data and mime type
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: "Invalid image format" });
      }
      
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');

      console.log("Starting server-side Tesseract OCR...");
      const worker = await Tesseract.createWorker('eng', 1);
      const { data: { text } } = await worker.recognize(buffer);
      await worker.terminate();
      
      console.log("OCR Text Extracted, running context-aware parser...");

      // Context-aware heuristic parser (since ML models crashed the frontend)
      let items: any[] = [];
      let totalAmount = 0;
      let shopName = "Scanned Receipt";
      
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // Find shop name
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const cleaned = lines[i].replace(/[^a-zA-Z\s]/g, '').trim();
        if (cleaned.length > 4) {
          shopName = cleaned.toUpperCase();
          break;
        }
      }
      
      // Extract items and total
      let currentItemName = "";
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        const totalMatch = line.match(/total\s*(amount|payable)?\s*[:=\-]?\s*\$?\s*(\d+\.\d{2})/i);
        if (totalMatch) {
          totalAmount = Math.max(totalAmount, parseFloat(totalMatch[2]));
          continue;
        }
        if (/total|sub|tax|gst|change|cash|balance|amount/.test(line)) continue;
        
        const prices = line.replace(/\s+/g, '').match(/[\$£€]?\d+[.,]\d{2}/g);
        if (prices) {
          const priceStr = prices[prices.length - 1];
          const price = parseFloat(priceStr.replace(/[^0-9.,]/g, '').replace(',', '.'));
          
          if (price > 0 && price < 1000) {
              let name = lines[i].replace(/[\d.,\s\$£€]+$/, '').trim();
             
             // Advanced heuristic text cleaning to remove OCR gibberish (simulating light layer)
             name = name.replace(/\b\d{1,4}[-/]\d{1,2}[-/]\d{2,4}\b/g, '') // Dates
                        .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, '') // Times
                        .replace(/\b[A-Z0-9]{6,}\b/g, '') // Long IDs
                        .replace(/\b\d{3,}\b/g, ''); // Long numbers
             
             name = name.split(/\s+/).filter(w => {
                 if (!w) return false;
                 if (w.length === 1 && !/^[a-zA-Z&]$/.test(w)) return false; // Single symbol
                 if (/^\d+$/.test(w)) return false; // Just numbers
                 const letters = w.replace(/[^a-zA-Z]/g, '').length;
                 if (w.length > 2 && letters < w.length * 0.4) return false; // Mostly noise
                 return true;
             }).join(' ').replace(/[^a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
             
             if (name.length < 3 && currentItemName) {
                 // Try to clean the previous line as well
                 name = currentItemName.replace(/[^a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
                 currentItemName = "";
             }
             if (name.length < 3) name = `Item ${items.length + 1}`;
             
             // Capitalize first letter of each word
             name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
             
             items.push({ name, price, quantity: 1, category: "Uncategorized" });
          }
        } else if (lines[i].replace(/[^a-zA-Z]/g, '').length > 3) {
          currentItemName = lines[i];
        }
      }

      if (totalAmount === 0 && items.length > 0) {
        totalAmount = items.reduce((sum, item) => sum + item.price, 0);
      }
      
      if (items.length === 0) {
        items.push({ name: "Scanned Items", price: totalAmount || 0, quantity: 1, category: "Grocery" });
      }

      const parsedData = { shopName, totalAmount, items };
      res.json(parsedData);
      
    } catch (error: any) {
      console.error("Error in /api/scan:", error);
      res.status(500).json({ error: error.message });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.post("/api/gemini/scan", async (req, res) => {
    try {
      const { image, model = "gemini-3.1-flash-lite" } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Extract base64 data and mime type
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: "Invalid image format" });
      }
      
      const mimeType = match[1];
      const base64Data = match[2];

      console.log(`[Gemini] Scanning with model: ${model}`);

      const response = await genAI.models.generateContent({
        model: model,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: "Analyze this receipt image. Extract: shopName, totalAmount (as number), date (ISO format if possible), and items (array of { name, price, quantity, category }). Return strictly as JSON.",
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shopName: { type: Type.STRING },
              totalAmount: { type: Type.NUMBER },
              date: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                    quantity: { type: Type.NUMBER },
                    category: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("[Gemini Scan Error]", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
