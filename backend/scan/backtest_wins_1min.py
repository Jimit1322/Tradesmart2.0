"""
Backtest 1m trades for win/loss based on future candles after scan.
"""

from pymongo import MongoClient
import yfinance as yf
from datetime import datetime, timedelta, timezone
import pandas as pd

# --- Mongo Setup ---
client = MongoClient("mongodb://localhost:27017")
db = client["tradesmart"]
collection = db["scan_1m"]

# --- Load all pending trades ---
pending_trades = list(collection.find({ "strategy": "1m_momentum", "status": "pending" }))
print(f"🟡 Found {len(pending_trades)} pending trades to backtest...")

for trade in pending_trades:
    symbol = trade["symbol"] + ".NS"
    entry_time = pd.to_datetime(trade["timestamp"])
    target = float(trade["target"])
    stop_loss = float(trade["stop_loss"])

    now_utc = datetime.now(timezone.utc)
    if (now_utc - entry_time).total_seconds() < 3600:
        print(f"⏳ {symbol}: Entry too recent (less than 1hr), skipping")
        continue

    try:
        data = yf.download(
            symbol,
            interval="1m",
            start=entry_time,
            end=entry_time + timedelta(days=2),
            progress=False,
            auto_adjust=False
        )

        if data.empty or entry_time not in data.index:
            print(f"⛔ {symbol}: No data after entry")
            collection.update_one(
                {"_id": trade["_id"]},
                {"$set": {"status": "no_data"}}
            )
            continue

        start_idx = data.index.get_loc(entry_time)
        future = data.iloc[start_idx + 1 : start_idx + 40] 

        result = "no_hit"
        for _, row in future.iterrows():
            high = float(row["High"])
            low = float(row["Low"])

            if high >= target:
                result = "win"
                break
            elif low <= stop_loss:
                result = "loss"
                break

        collection.update_one(
            {"_id": trade["_id"]},
            {"$set": { "status": result }}
        )

        print(f"✅ {trade['symbol']} → {result}")

    except Exception as e:
        print(f"❌ Error processing {trade['symbol']}: {e}")
