import yfinance as yf
import pandas as pd
import sys
import json
import os

if len(sys.argv) < 2:
    print(" Error: No stock symbol provided. Usage: python fetch_ohlc.py SYMBOL")
    sys.exit(1)

symbol_raw = sys.argv[1].strip().upper()
symbol = symbol_raw + ".NS"


data = yf.download(symbol, interval="5m", period="15d", auto_adjust=False, progress=False)


if isinstance(data.columns, pd.MultiIndex):
    if symbol in data.columns.levels[1]:
        data = data.xs(symbol, axis=1, level=1)
    else:
        print(f" Error: '{symbol}' not found in downloaded data columns.")
        sys.exit(1)

data = data.reset_index()


data["EMA22"] = data["Close"].ewm(span=22, adjust=False).mean()


ohlc = []
for _, row in data.iterrows():
    timestamp = int(pd.to_datetime(row["Datetime"]).timestamp())
    ohlc.append({
        "time": timestamp,
        "open": round(float(row["Open"]), 2),
        "high": round(float(row["High"]), 2),
        "low": round(float(row["Low"]), 2),
        "close": round(float(row["Close"]), 2),
        "ema22": round(float(row["EMA22"]), 2) if not pd.isna(row["EMA22"]) else None,
        "volume": int(row["Volume"])
    })


os.makedirs("scan/data", exist_ok=True)
with open(f"scan/data/{symbol_raw}.json", "w") as f:
    json.dump(ohlc, f)
