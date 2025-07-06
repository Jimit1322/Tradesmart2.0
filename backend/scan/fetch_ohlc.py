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


ema_col = "EMA22" if interval == "5m" else "EMA9"
ema_span = 22 if interval == "5m" else 9


try:
    data = yf.download(symbol, interval=interval, period="7d", auto_adjust=False, progress=False)
except Exception as e:
    print(f"Error fetching data for {symbol}: {e}")
    sys.exit(1)

if data.empty:
    print(f"No data returned for {symbol}.")
    sys.exit(1)

# Flatten multilevel columns if needed
if isinstance(data.columns, pd.MultiIndex):
    if symbol in data.columns.levels[1]:
        data = data.xs(symbol, axis=1, level=1)
    else:
        print(f"Error: '{symbol}' not found in downloaded data columns.")
        sys.exit(1)

data = data.reset_index()
data[ema_col] = data["Close"].ewm(span=ema_span, adjust=False).mean()

ohlc = []
for _, row in data.iterrows():
    timestamp = int(pd.to_datetime(row.iloc[0]).timestamp())  # assumes first column is datetime
    ohlc.append({
        "time": timestamp,
        "open": round(float(row["Open"]), 2),
        "high": round(float(row["High"]), 2),
        "low": round(float(row["Low"]), 2),
        "close": round(float(row["Close"]), 2),
        ema_col.lower(): round(float(row[ema_col]), 2) if pd.notna(row[ema_col]) else None,
        "volume": int(row["Volume"]) if not pd.isna(row["Volume"]) else 0
    })

# Save to appropriate file
os.makedirs("scan/data", exist_ok=True)
with open(f"scan/data/{symbol_raw}_{interval}.json", "w") as f:
    json.dump(ohlc, f,indent=2)
