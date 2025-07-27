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
import cron from 'node-cron';
import { fileURLToPath } from 'url';


const app = express();
const PORT = 4000;

app.use(cors());
app.use(json());


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
const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
app.get('/api/scan/daily', (req, res) => {
  
  const resultPath = path.join(__dirname, 'scan', 'results_44_daily.json');

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
    console.log("⚠️ No cached daily result found, generating fresh...");
  }

  console.log("🔁 Running fresh daily scan (44 EMA)...");
  const scanProcess = exec('python3 scan_44ema_daily.py', { cwd: path.join(__dirname, 'scan') });

  scanProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Python script exited with code ${code}`);
      return res.status(500).json({ daily: [] });
    }

    try {
      const raw = fs.readFileSync(resultPath, 'utf8');
      const data = JSON.parse(raw);
      console.log(`✅ daily → ${data.length} stocks`);
      res.json({ daily: data });
    } catch (err) {
      console.error("❌ Failed to read daily results:", err.message);
      res.status(500).json({ daily: [] });
    }
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

    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const results = await collection
      .find({
        strategy: "5m_momentum",
        timestamp: { $gte: monday.toISOString() }, // ✅ Filter only this week's data
      })
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

    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const results = await collection
      .find({
        strategy: "1m_momentum",
        timestamp: { $gte: monday.toISOString() }, // ✅ Filter only this week's data
      })
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

// Run 5m backtest every 30 minutes
cron.schedule('*/30 * * * *', () => {
  console.log("⏱️ Running 5m backtest...");
  exec('python3 scan/backtest_wins_5min.py', (err, stdout, stderr) => {
    if (err) return console.error("❌ 5m Backtest error:", err.message);
    console.log(stdout);
  });
});





app.get("/api/summary", async (req, res) => {
  try {
    const collection5m = await getCollection("scan_5m");
    const collection1m = await getCollection("scan_1m");

    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Last Monday
    monday.setHours(0, 0, 0, 0);

    const query = { timestamp: { $gte: monday.toISOString() } };

    const [all5m, all1m] = await Promise.all([
      collection5m.find(query).toArray(),
      collection1m.find(query).toArray(),
    ]);

    const summarize = (data) => {
      const total = data.length;
      const wins = data.filter((d) => d.status === "win").length;
      const losses = data.filter((d) => d.status === "loss").length;
      const noHits = data.filter((d) => d.status === "no_hit").length;
      const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) : "0.00";
      return { total, wins, losses, noHits, winRate };
    };

    res.json({
      summary_5m: summarize(all5m),
      summary_1m: summarize(all1m),
    });
  } catch (err) {
    console.error("❌ Weekly summary error:", err.message);
    res.status(500).json({ error: "Failed to get weekly summary" });
  }
});

// 🕒 Weekly cleanup and summary every Sunday at 6:00 PM


// Every Sunday at 6:00 PM
cron.schedule("0 18 * * 0", () => {
  const scriptPath = path.join("scan", "cleanup_and_summarize.py");
  console.log("🧹 Running weekly cleanup_and_summarize.py...");

  exec(`python3 ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Cleanup Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ Cleanup stderr: ${stderr}`);
    }
    console.log(`✅ Cleanup Output:\n${stdout}`);
  });
});
// backend/routes/summary.js or index.js
app.get("/api/summary/all", async (req, res) => {
  try {
    const collection = await getCollection("weekly_summary");

    const raw = await collection.find().sort({ created_at: -1 }).toArray();

    // 🧠 Merge by week_start + week_end
    const summaryMap = {};

    for (const item of raw) {
      const weekKey = `${item.week_start} → ${item.week_end}`;

      if (!summaryMap[weekKey]) {
        summaryMap[weekKey] = { week: weekKey };
      }

      if (item.strategy === "5m_momentum") {
        summaryMap[weekKey].summary_5m = {
          wins: item.wins,
          losses: item.losses,
          winRate: item.win_rate,
          noHits: item.no_hits || 0, // fallback
        };
      } else if (item.strategy === "1m_momentum") {
        summaryMap[weekKey].summary_1m = {
          wins: item.wins,
          losses: item.losses,
          winRate: item.win_rate,
          noHits: item.no_hits || 0,
        };
      }
    }

    // 🔃 Convert to array sorted by most recent
    const mergedSummaries = Object.values(summaryMap).sort((a, b) =>
      b.week.localeCompare(a.week)
    );

    res.json(mergedSummaries);
  } catch (err) {
    console.error("❌ Summary list fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch summaries" });
  }
});




// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
