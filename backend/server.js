import express, { json } from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(json());
const PORT = 4000;


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
            console.error(`JSON Parse Error in file: ${filePath}`, parseErr.message);
            return res.status(500).json({ error: 'Invalid JSON format.' });
        }
    });
}


app.get('/api/scan/listofstocks', (req, res) => {
    exec('python3 scan/scan_momentum.py', (err, stdout, stderr) => {
        if (err) {
            console.error(' Error running scan_momentum.py:', stderr);
            return res.status(500).send(stderr);
        }
        try {
            const data = fs.readFileSync('./scan/results.json', 'utf8');
            res.json(JSON.parse(data));
        } catch (e) {
            console.error(' Error reading/parsing results.json:', e);
            return res.status(500).send('Failed to read scan result');
        }
    });
});


app.get('/api/ohlc/:symbol', (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    const jsonPath = path.join('scan/data', `${symbol}.json`);

    exec(`python3 scan/fetch_ohlc.py ${symbol}`, (err, stdout, stderr) => {
        if (err || stderr) {
            console.error(` Error executing fetch_ohlc.py for ${symbol}:`, stderr || err.message);
            return res.status(500).json({ error: `Failed to fetch OHLC for ${symbol}` });
        }

        readJSON(jsonPath, res);
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
}); 