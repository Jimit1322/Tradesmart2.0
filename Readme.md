<!-- TradeSmart – Real-Time Momentum Stock Scanner
React | Node.js | Express | Python | yFinance | REST API | Lightweight-Charts

1.Engineered a full-stack momentum scanner that identifies intraday trading opportunities by analyzing 5-minute OHLC data and computing 22-period Exponential Moving Averages (EMA) for NSE stocks using yfinance.
2.Implemented a Python-based data pipeline to fetch and preprocess live stock data, calculate EMA-22, and serialize results into JSON format, forming the data backbone of the application.
3.Built a RESTful API using Node.js and Express that interfaces with Python scripts, handles dynamic symbol-based data retrieval, and returns filtered stocks matching momentum criteria (close price within 0.5% of EMA22).
4.Developed a responsive React frontend with lightweight-charts to visualize candlestick patterns and EMA lines in real-time, integrated stock CSV export, and applied consistent UI styling for trader-friendly interaction. -->

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

