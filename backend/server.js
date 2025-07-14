/**
 * Express Server for TradeSmart 2.0
 * - /api/scan/intraday → 5m, 1m scan from MongoDB
 * - /api/scan/daily    → daily scan from JSON
 * - /api/ohlc/:symbol  → OHLC chart data from file
 * - /api/history/5m    → last 5m scan results (from MongoDB)
 */

import express, { json } from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import cors from 'cors';
import path from 'path';
import { getCollection } from './db.js';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(json());

// --- /api/scan/intraday → Serve 5m + 1m results from MongoDB ---
// app.get('/api/scan/intraday', async (req, res) => {
//   try {
//     const collection = await getCollection("scan_5m");

//     const today = new Date();
//     const scanDate = today.toISOString().slice(0, 10); // "YYYY-MM-DD"

//     const data5m = await collection
//       .find({ scan_date: scanDate, strategy: "5m_momentum" })
//       .toArray();

//     // TODO: If you also scan and store 1m data to MongoDB, fetch that too
//     const data1m = []; // empty for now

//     console.log(`📦 MongoDB: ${data5m.length} stocks (5m)`);
//     res.json({ "5m": data5m, "1m": data1m });
//   } catch (err) {
//     console.error("❌ MongoDB intraday fetch failed:", err.message);
//     res.status(500).json({ error: "MongoDB intraday fetch failed" });
//   }
// });
app.get('/api/scan/intraday', async (req, res) => {
  console.log("🔁 Running intraday scan (5m + 1m) and fetching from MongoDB");

  let completed = 0;
  const results = {};

  const checkAndRespond = () => {
    if (completed === 2) {
      console.log("✅ Intraday scan response sent.");
      res.json(results);
    }
  };

  const runScanAndFetch = async (label, script, strategy, collectionName) => {
    exec(`python3 ${script}`, { cwd: 'scan' }).on('close', async () => {
      try {
        const collection = await getCollection(collectionName);
        const today = new Date().toISOString().slice(0, 10);
        const stocks = await collection.find({ scan_date: today, strategy }).toArray();
        results[label] = stocks;
        console.log(`✅ ${label} → ${stocks.length} stock(s)`);
      } catch (err) {
        console.error(`❌ Failed to read ${label} from MongoDB:`, err.message);
        results[label] = [];
      }
      completed++;
      checkAndRespond();
    });
  };

  runScanAndFetch("5m", "scan_momentum_5min.py", "5m_momentum", "scan_5m");
  runScanAndFetch("1m", "scan_momentum_1min.py", "1m_momentum", "scan_1m");
});

// --- /api/scan/daily → Daily 44 EMA scan from results_44_daily.json ---
app.get('/api/scan/daily', (req, res) => {
  const resultPath = path.join('scan', 'results_44_daily.json');

  try {
    const stats = fs.statSync(resultPath);
    const lastModified = new Date(stats.mtime);
    const today = new Date();

    const isToday =
      lastModified.getFullYear() === today.getFullYear() &&
      lastModified.getMonth() === today.getMonth() &&
      lastModified.getDate() === today.getDate();

    if (isToday) {
      console.log("📦 Serving cached daily scan result");
      const raw = fs.readFileSync(resultPath, 'utf8');
      const data = JSON.parse(raw);
      return res.json({ daily: data });
    }
  } catch (err) {
    console.log("⚠️ No daily scan result found or invalid, will generate fresh.");
  }

  console.log("🔁 Running fresh daily scan (44 EMA)");
  const process = exec('python3 scan_44ema_daily.py', { cwd: 'scan' });

  process.on('close', () => {
    try {
      const raw = fs.readFileSync(resultPath, 'utf8');
      const data = JSON.parse(raw);
      console.log(`✅ daily → ${data.length} stocks`);
      res.json({ daily: data });
    } catch (err) {
      console.error("❌ Failed to read daily results:", err.message);
      res.json({ daily: [] });
    }
  });

  process.on('error', (err) => {
    console.error("❌ Error running daily scan script:", err.message);
    res.status(500).json({ error: "Failed to execute daily scan" });
  });
});

// --- /api/ohlc/:symbol?tf=... → Live OHLC + EMA from fetch_ohlc.py ---
app.get('/api/ohlc/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const tf = req.query.tf || '5m';
  const filePath = `scan/data/${symbol}_${tf}.json`;

  const process = exec(`python3 fetch_ohlc.py ${symbol} ${tf}`, { cwd: 'scan' });

  process.on('close', () => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(`❌ Could not read ${filePath}:`, err.message);
        return res.status(404).json({ error: `No chart data for ${symbol} (${tf})` });
      }

      try {
        const json = JSON.parse(data);
        res.json(json);
      } catch (parseErr) {
        console.error(`❌ JSON Parse error:`, parseErr.message);
        res.status(500).json({ error: 'Invalid JSON format' });
      }
    });
  });

  process.on('error', (err) => {
    console.error(`❌ fetch_ohlc.py failed for ${symbol} (${tf}):`, err.message);
    res.status(500).json({ error: 'Chart data fetch failed' });
  });
});

// --- /api/history/5m → Get last 1000 5m scan results grouped by date ---
app.get("/api/history/5m", async (req, res) => {
  try {
    const collection = await getCollection("scan_5m");

    const results = await collection
      .find({ strategy: "5m_momentum" })
      .sort({ timestamp: -1 })
      .limit(1000)
      .toArray();

    const grouped = {};

    for (const stock of results) {
      const date = stock.scan_date;
      if (!grouped[date]) {
        grouped[date] = { stocks: [], win: 0, loss: 0, no_hit: 0, pending: 0 };
      }

      grouped[date].stocks.push(stock);

      const status = stock.status || "pending";
      if (status === "win") grouped[date].win++;
      else if (status === "loss") grouped[date].loss++;
      else if (status === "no_hit") grouped[date].no_hit++;
      else grouped[date].pending++;
    }

    res.json(grouped);
  } catch (err) {
    console.error("❌ History fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch scan history" });
  }
});

app.get("/api/history/1m", async (req, res) => {
  try {
    const collection = await getCollection("scan_1m");

    const results = await collection
      .find({ strategy: "1m_momentum" })
      .sort({ timestamp: -1 })
      .limit(1000)
      .toArray();

    const grouped = {};

    for (const stock of results) {
      const date = stock.scan_date;
      if (!grouped[date]) {
        grouped[date] = { stocks: [], win: 0, loss: 0, no_hit: 0, pending: 0 };
      }

      grouped[date].stocks.push(stock);

      const status = stock.status || "pending";
      if (status === "win") grouped[date].win++;
      else if (status === "loss") grouped[date].loss++;
      else if (status === "no_hit") grouped[date].no_hit++;
      else grouped[date].pending++;
    }

    res.json(grouped);
  } catch (err) {
    console.error("❌ History fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch scan history" });
  }
});



// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
