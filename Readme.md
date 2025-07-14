# 📈 TradeSmart 2.0 - Momentum Retest Stock Scanner

**TradeSmart 2.0** is a full-stack stock scanner and backtesting engine that identifies **momentum-based trading opportunities** using **EMA retests** on NSE stocks.

---

## 🚀 Features

- 🔍 **Real-time stock scanning** using:
  - ✅ 5-minute chart (EMA22)
  - ✅ 1-minute chart (EMA9)
  - ✅ Daily (EMA44)
- 🔁 Identifies **retest near EMA after strong move**
- 📉 **Backtest win/loss** automatically using live future candles
- 🧾 CSV export support
- 📊 Interactive charts (Lightweight Charts) with:
  - EMA overlays
  - Volume bars
  - Trade visualization with entry, target, and stop-loss
- 💾 Stores all scans in **MongoDB** for historical viewing
- 📜 Shows **Scan History** tab with daily wins/losses

---

## 🧠 Strategy Logic

### ✅ 5-Min Strategy (`scan_momentum_5min.py`)

- Looks back 60 candles to find:
  - ≥3 strong bullish candles (gain > 0.5%, closing above previous high)
- Retest of **EMA22**, or **gap-up + EMA pullback**
- EMA must have a **positive slope**
- 🎯 Calculates dynamic `target` and `stop-loss`
- ➕ Logs trades to MongoDB with `"status": "pending"` → later evaluated for **win/loss**

### ✅ 1-Min Strategy (`scan_momentum_1min.py`)

- Uses last 80 candles:
  - ≥4 bullish candles in a 7-candle window
  - Gain > 0.3%
- Confirms **proximity to EMA9**
- Pushes results to MongoDB for history & backtesting

---

## ♻️ Win/Loss Backtesting (`backtest_5m.py`, `backtest_1m.py`)

- For each pending trade:
  - Fetches next **up to 2 days** of 1m/5m candles
  - Marks trade as:
    - ✅ `win` → if target hit
    - ❌ `loss` → if stop-loss hit
    - ⏸️ `no_hit` → if neither
- Status is **auto-updated in MongoDB** and shown in UI

---

## 💾 MongoDB Integration

- All scan results stored in:
  - `scan_5m` for 5m strategy
  - `scan_1m` for 1m strategy
- Indexed by:
  - `symbol`, `scan_date`, `timestamp`, `strategy`, `status`
- De-duplicates based on `symbol + date + strategy`

---

## 🧑‍💻 Frontend (React + Tailwind + Lightweight Charts)

### Components:
- `StockChart.jsx` → Candlestick chart with entry/SL/target visualization
- `TimeframeTabs.jsx` → Tabs for switching 5m / 1m / Daily view
- `ScanHistory.jsx` → Historical scan results + win/loss statuses

### Features:
- 🔍 **Search filter**
- 📅 **Tab switchable scan history**
- 🟢 Green = `win`, 🔴 Red = `loss`, 🟡 Yellow = `pending`
- Chart includes crosshair + OHLC info

---

## 🛠 Tech Stack

| Layer       | Tools & Libraries                              |
|-------------|------------------------------------------------|
| Backend     | Python, yfinance, pandas, pymongo              |
| Frontend    | React, Vite, Tailwind CSS, lightweight-charts  |
| Server/API  | Node.js, Express                               |
| Database    | MongoDB                                        |
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
## 👤 Author

**Jimit Sankhesara**  
📧 jimitsankhesara9@gmail.com  
🔗 [GitHub](https://github.com/Jimit1322)  

