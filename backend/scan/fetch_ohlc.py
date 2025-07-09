"""
fetch_ohlc.py

This script fetches historical intraday OHLC data for a given NSE stock symbol using the yfinance API and saves it as a JSON file.

It supports both 5-minute and 1-minute intervals and automatically calculates the appropriate EMA:
- **EMA22** for 5-minute interval
- **EMA9** for 1-minute interval

 How it works:
1. Takes the stock symbol (without ".NS") and optional interval ("5m" or "1m") from command line arguments.
2. Downloads the past 7 days of data from Yahoo Finance.
3. Calculates the selected EMA on the "Close" price.
4. Converts the data into a list of dictionaries (time, open, high, low, close, ema, volume).
5. Saves the result as a JSON file to `scan/data/{SYMBOL}_{INTERVAL}.json`.

 Usage:
    python fetch_ohlc.py RELIANCE 5m
    python fetch_ohlc.py INFY 1m

 Output Example:
[
  {
    "time": 1720252800,
    "open": 2723.0,
    "high": 2731.5,
    "low": 2719.8,
    "close": 2730.1,
    "ema22": 2725.43,
    "volume": 38420
  },
  ...
]
"""


import yfinance as yf
import pandas as pd
import sys
import json
import os

if len(sys.argv) < 2:
    print("Error: No stock symbol provided. Usage: python fetch_ohlc.py SYMBOL [INTERVAL]")
    sys.exit(1)

symbol_raw = sys.argv[1].strip().upper()
symbol = symbol_raw + ".NS"
interval = sys.argv[2] if len(sys.argv) > 2 else '5m'

# Choose EMA logic based on timeframe
if interval == "5m":
    period="60d"
    ema_col = "EMA22"
    ema_span = 22
elif interval == "1m":
    period="8d"
    ema_col = "EMA9"
    ema_span = 9
elif interval == "1d":
    period="max"
    ema_col = "EMA44"
    ema_span = 44
else:
    period="60d"
    ema_col = "EMA"
    ema_span = 20

try:
    data = yf.download(symbol, interval=interval, period=period, auto_adjust=False, progress=False)
except Exception as e:
    print(f"Error fetching data for {symbol}: {e}")
    sys.exit(1)

if data.empty:
    print(f"No data returned for {symbol}.")
    sys.exit(1)

# Flatten multi-index columns if needed
if isinstance(data.columns, pd.MultiIndex):
    if symbol in data.columns.levels[1]:
        data = data.xs(symbol, axis=1, level=1)
    else:
        print(f"Error: '{symbol}' not found in downloaded data columns.")
        sys.exit(1)

data = data.reset_index()
data["EMA9"] = data["Close"].ewm(span=9, adjust=False).mean()
data["EMA22"] = data["Close"].ewm(span=22, adjust=False).mean()
data["EMA44"] = data["Close"].ewm(span=44, adjust=False).mean()
# data[ema_col] = data["Close"].ewm(span=ema_span, adjust=False).mean()

ohlc = []
for _, row in data.iterrows():
    timestamp = int(pd.to_datetime(row.iloc[0]).timestamp())
    ohlc.append({
        "time": timestamp,
        "open": round(float(row["Open"]), 2),
        "high": round(float(row["High"]), 2),
        "low": round(float(row["Low"]), 2),
        "close": round(float(row["Close"]), 2),
       "ema9": round(float(row["EMA9"]), 2) if pd.notna(row["EMA9"]) else None,
    "ema22": round(float(row["EMA22"]), 2) if pd.notna(row["EMA22"]) else None,
    "ema44": round(float(row["EMA44"]), 2) if pd.notna(row["EMA44"]) else None,
        "volume": int(row["Volume"]) if not pd.isna(row["Volume"]) else 0
    })

# Save file
os.makedirs("data", exist_ok=True)
output_path = f"data/{symbol_raw}_{interval}.json"
with open(output_path, "w") as f:
    json.dump(ohlc, f, indent=2)

print(f"✅ Data saved: {output_path}")
