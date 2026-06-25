import express from "express";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { createServer as createViteServer } from "vite";
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const DB_FILE = path.join(process.cwd(), 'data.json');

// Initialize local DB
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ homes: {}, users: {}, productPrices: [] }));
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/extract-bill", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) return res.status(400).json({ error: "No image provided" });

      // Non-API mock OCR implementation
      // Simulating a local OCR text extraction process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const extractedData = {
        shopName: "LOCAL MARKET (NON-API OCR)",
        date: new Date().toISOString(),
        totalAmount: 142.50,
        category: "Grocery",
        items: [
          { name: "ORGANIC KALE", price: 6.98, quantity: 2, category: "Grocery" },
          { name: "AVOCADO BAG", price: 8.50, quantity: 1, category: "Grocery" },
          { name: "OAT MILK 1.8L", price: 4.45, quantity: 1, category: "Grocery" }
        ]
      };

      // Save product prices for price tracking
      const db = readDB();
      extractedData.items.forEach((item: any) => {
        db.productPrices.push({
          name: item.name,
          price: (item.price || 0) / (item.quantity || 1),
          shopName: extractedData.shopName,
          date: new Date().toISOString()
        });
      });
      writeDB(db);

      res.json(extractedData);
    } catch (error) {
      console.error("OCR Error:", error);
      res.status(500).json({ error: "Failed to extract bill details" });
    }
  });

  app.post("/api/parse-sms", async (req, res) => {
    try {
      const { smsText } = req.body;
      
      // Simple regex-based non-API parsing
      const amountMatch = smsText.match(/\$([0-9]+\.[0-9]+)/);
      const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
      
      let bankName = "Unknown Bank";
      if (smsText.toLowerCase().includes("chase")) bankName = "Chase";
      if (smsText.toLowerCase().includes("bank of america")) bankName = "BoA";
      
      let sender = "Unknown Merchant";
      const atMatch = smsText.match(/at\s+([A-Z0-9\s]+)\./i);
      if (atMatch) sender = atMatch[1].trim();

      res.json({
        amount,
        sender,
        bankName,
        date: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to parse SMS" });
    }
  });

  app.get("/api/compare-prices", (req, res) => {
    const { productName } = req.query;
    const db = readDB();
    const matches = db.productPrices.filter((p: any) => 
      p.name.toLowerCase().includes((productName as string || "").toLowerCase())
    );
    res.json(matches);
  });

  app.post("/api/home/join", (req, res) => {
    const { inviteCode, userId, userName } = req.body;
    const db = readDB();
    const homeId = Object.keys(db.homes).find(id => db.homes[id].inviteCode === inviteCode);
    
    if (!homeId) return res.status(404).json({ error: "Home not found" });
    
    const user = { id: userId, name: userName, homeId };
    db.users[userId] = user;
    if (!db.homes[homeId].members.find((m: any) => m.id === userId)) {
      db.homes[homeId].members.push(user);
    }
    writeDB(db);
    res.json(db.homes[homeId]);
  });

  app.post("/api/home/create", (req, res) => {
    const { name, userId, userName } = req.body;
    const db = readDB();
    const homeId = uuidv4();
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const home = { id: homeId, name, inviteCode, members: [{ id: userId, name: userName, homeId }], billHistory: [] };
    db.homes[homeId] = home;
    db.users[userId] = { id: userId, name: userName, homeId };
    
    writeDB(db);
    res.json(home);
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
