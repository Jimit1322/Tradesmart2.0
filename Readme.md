
# 📈 TradeSmart 2.0 - Momentum Retest Stock Scanner

**TradeSmart 2.0** is a full-stack stock scanner that identifies **momentum stocks** which are **retesting their EMA (22 or 9)** after a strong move. It uses a Python backend for stock scanning and a React frontend for interactive chart visualization.

---

## 🚀 Features

- 📊 Scans both **5-minute** and **1-minute** charts for momentum setups.
- 🔁 Detects **retest** of EMA (22 for 5m, 9 for 1m) after strong bullish momentum.
- 🧠 Applies filters like:
  - 3–4 bullish candles out of 5 with >0.3–0.5% gains
  - Breakout above previous candle highs
  - Price pullback to EMA
  - Optional gap-up or rising EMA slope
- 🧾 CSV export for easy tracking and analysis
- 📈 Lightweight interactive charts with:
  - EMA overlays
  - Toggleable volume bars
  - Crosshair-based OHLC/volume info

---

## 🧠 Strategy Logic

### ✅ 5-Min Strategy (scanner_5m.py)
- Detects momentum in previous 40–60 candles using:
  - ≥3 bullish candles in a 5-candle window
  - Each gaining >0.5% and closing above previous high
- Confirms price is **now near EMA22** or **gapped up + pulled back**

### ✅ 1-Min Strategy (scanner_1m.py)
- Detects micro-momentum in last 80+ candles:
  - ≥4 bullish candles in a 5-candle window
  - Gains >0.3% and price near EMA9

### ✅ Slope Filter (Optional)
- Identifies stocks with a **consistently rising EMA** (min % rise over 5+ candles)

---

## 🛠 Tech Stack

| Layer       | Tools & Libraries                              |
|-------------|------------------------------------------------|
| Backend     | Python, yfinance, pandas, scipy                |
| Frontend    | React, Vite, lightweight-charts, Tailwind CSS  |
| Server/API  | Node.js, Express                               |
| Data Format | JSON, CSV                                      |

---


## ⚙️ Commands To Run

```bash
# Python packages
pip install -r scan/requirements.txt

# Node backend
cd server
npm install
node server.js

# React frontend
cd client
npm install
npm run dev
```

---

## 👤 Author

**Jimit Sankhesara**  
📧 jimitsankhesara9@gmail.com  
🔗 [GitHub](https://github.com/Jimit1322)  
🔗 [LinkedIn](https://www.linkedin.com/in/jimit-sankhesara)
