import express, { json } from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(json());
const PORT = 4000;

// Utility to read and parse JSON file
function readJSON(filePath, res) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(` File Read Error: ${filePath}`, err.message);
      return res.status(500).json({ error: 'Could not read JSON file.' });
    }

    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch (parseErr) {
      console.error(` JSON Parse Error in file: ${filePath}`, parseErr.message);
      return res.status(500).json({ error: 'Invalid JSON format.' });
    }
  });
}

//  Combined scan route
app.get('/api/scan', async (req, res) => {
  const scan5m = exec('python3 scan/scan_momentum.py');
  const scan1m = exec('python3 scan/scan_momentum_1min.py');

  let completed = 0;
  const results = {};

  const checkAndRespond = () => {
    if (completed === 2) {
      res.json(results);
    }
  };

  scan5m.on('close', (code) => {
    try {
      const data = fs.readFileSync('./scan/results.json', 'utf8');
      results['5m'] = JSON.parse(data);
    } catch (e) {
      console.error(" Failed to read 5min results:", e.message);
      results['5m'] = [];
    }
    completed++;
    checkAndRespond();
  });

  scan1m.on('close', (code) => {
    try {
      const data = fs.readFileSync('./scan/results_1min.json', 'utf8');
      results['1m'] = JSON.parse(data);
    } catch (e) {
      console.error(" Failed to read 1min results:", e.message);
      results['1m'] = [];
    }
    completed++;
    checkAndRespond();
  });
});

// OHLC fetch endpoint with ?tf=1m/5m
app.get('/api/ohlc/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const tf = req.query.tf || '5m';
  const jsonPath = `scan/data/${symbol}_${tf}.json`;

  exec(`python3 scan/fetch_ohlc.py ${symbol} ${tf}`, (err, stdout, stderr) => {
    if (err || stderr) {
      console.error(`Error executing fetch_ohlc.py for ${symbol} ${tf}:`, stderr || err.message);
      return res.status(500).json({ error: `Failed to fetch OHLC for ${symbol}` });
    }

    readJSON(jsonPath, res);
  });
});

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});
