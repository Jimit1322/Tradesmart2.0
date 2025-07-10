/**
 * Express Server for TradeSmart 2.0
 * - /api/scan        → fresh 5m, 1m, daily scans
 * - /api/ohlc/:symbol?tf=... → live OHLC + EMA chart data
 */

import express, { json } from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(json());

// --- Helper to safely read JSON ---
function readJSONSync(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Failed to read ${filePath}:`, err.message);
    return [];
  }
}

// --- /api/scan → Runs 5m, 1m, daily scan scripts ---
// app.get('/api/scan', async (req, res) => {
//   console.log("🔁 Starting fresh scan for 5m, 1m, daily...");

//   let completed = 0;
//   const results = {};

//   const checkAndRespond = () => {
//     if (completed === 3) {
//       console.log("✅ All scans completed. Responding...");
//       res.json(results);
//     }
//   };

//   const runScript = (label, script, outputFile) => {
//     const process = exec(`python3 ${script}`, { cwd: 'scan' });

//     process.on('close', () => {
//       const data = readJSONSync(`scan/${outputFile}`);
//       results[label] = data;
//       console.log(`✅ ${label} → ${data.length} stock(s)`);
//       completed++;
//       checkAndRespond();
//     });

//     process.on('error', (err) => {
//       console.error(`❌ ${label} failed:`, err.message);
//       results[label] = [];
//       completed++;
//       checkAndRespond();
//     });
//   };

//   runScript('5m', 'scan_momentum_5min.py', 'results.json');
//   runScript('1m', 'scan_momentum_1min.py', 'results_1min.json');
//   runScript('daily', 'scan_44ema_daily.py', 'results_44_daily.json');
// });
// --- /api/scan/intraday → 5m + 1m scans only ---
app.get('/api/scan/intraday', (req, res) => {
  console.log("🔁 Starting intraday scan (5m + 1m)");

  let completed = 0;
  const results = {};

  const checkAndRespond = () => {
    if (completed === 2) {
      console.log("✅ Intraday scan done.");
      res.json(results);
    }
  };

  const runScript = (label, script, outputFile) => {
    const process = exec(`python3 ${script}`, { cwd: 'scan' });

    process.on('close', () => {
      const path = `scan/${outputFile}`;
      try {
        const raw = fs.readFileSync(path, 'utf8');
        results[label] = JSON.parse(raw);
        console.log(`✅ ${label} → ${results[label].length} stocks`);
      } catch (err) {
        console.error(`❌ Failed to read ${label}:`, err.message);
        results[label] = [];
      }
      completed++;
      checkAndRespond();
    });
  };

  runScript('5m', 'scan_momentum_5min.py', 'results.json');
  runScript('1m', 'scan_momentum_1min.py', 'results_1min.json');
});


// --- /api/scan/daily → Daily 44 EMA scan only ---
app.get('/api/scan/daily', (req, res) => {
  const resultPath = path.join('scan', 'results_44_daily.json');

  // Check if the results file exists and is from today
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

  // If not cached for today, run the Python script
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

// --- /api/ohlc/:symbol?tf=... → Fetch OHLC + EMA data dynamically ---
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

// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
