<!-- Full-Stack Trading Tool (Python, Node.js, React, Lightweight-Charts)

Developed a real-time stock scanner that identifies NSE-listed equities showing strong momentum followed by a retest near the 22-period EMA using 5-minute interval data.

Implemented backend logic in Python to fetch historical OHLC and volume data via yfinance, apply EMA and price action filters, and serve results through a Node.js Express API.

Designed a dynamic React frontend that visualizes candlestick charts with EMA overlays and toggleable volume histograms using lightweight-charts, with interactive hover insights.

Optimized for live usage by integrating automatic cleanup of temporary data files and CSV export functionality; ensured crosshair-driven candle analytics (OHLC, volume, % change) for trade decision-making. -->

# 📈 TradeSmart 2.0 - Momentum Retest Stock Scanner

**TradeSmart 2.0** is a full-stack stock scanner that identifies **momentum stocks**  which are **retesting their 22 EMA** after a strong move. It combines a Python-based backend for data fetching and analysis with a React frontend for interactive charting.

---

## 🚀 Features

- 📊 Scans for **5-minute candle momentum** in the last few sessions.
- 🔁 Detects **retest** of 22 EMA after strong bullish momentum.
- 🔎 Only includes stocks where **last 3 candles** gained **>0.5%** and closed above previous highs.
- 🧠 Uses **Yahoo Finance API** to fetch real-time OHLC and volume data.
- 🧾 One-click download of matching stocks as **CSV**.
- 🧩 Interactive **candlestick + EMA + volume charts** using `lightweight-charts`.
- 📉 Toggleable **volume bar** and hover-based candle info (OHLC, % change, volume).


---

## 🧠 Strategy Logic

This scanner identifies **stocks in momentum** followed by a **pullback to 22 EMA**, signaling potential Intraday entries.

1. **Momentum Detection**
   - Backtracks 40 to 5 candles from the end.
   - Looks for any 3-candle segment where **at least 3 candles**:
     - Are **bullish** (close > open),
     - Have **>0.5% gain**, and
     - Close **above previous high**.

2. **Retest Condition**
   - The current (latest) candle’s **close is within ±0.5% of the 22 EMA**.
   - If both conditions are satisfied, the stock is included in the result.

---

## 🛠 Tech Stack

| Layer       | Tech                         |
|------------|------------------------------|
| Backend     | Python, `yfinance`, `pandas` |
| Frontend    | React, `lightweight-charts`  |
| Server/API  | Node.js, Express.js          |
| Charting    | Candlesticks, EMA, Volume    |

---

## **Commands To Run on Terminal**

```bash
pip install -r scan/requirements.txt

cd backend
npm install
node server.js

cd frontend
npm install
npm run dev

