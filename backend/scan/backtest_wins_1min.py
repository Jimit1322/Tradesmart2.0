"""
Backtest 1m trades for win/loss based on future candles after scan.
"""

from pymongo import MongoClient
import yfinance as yf
from datetime import datetime, timedelta, timezone
import pandas as pd

# --- MongoDB Setup ---
client = MongoClient("mongodb://localhost:27017")
db = client["tradesmart"]
collection = db["scan_1m"]

# --- Fetch trades to backtest ---
pending_trades = list(collection.find({ "strategy": "1m_momentum", "status": "pending" }))
no_hit_trades = list(collection.find({ "strategy": "1m_momentum", "status": "no_hit" }))

all_trades = pending_trades + no_hit_trades
print(f"🟡 Found {len(all_trades)} total 1m trades to backtest...")

for trade in all_trades:
    symbol = trade["symbol"] + ".NS"
    entry_time = pd.to_datetime(trade["timestamp"])
    target = float(trade["target"])
    stop_loss = float(trade["stop_loss"])

    now_utc = datetime.now(timezone.utc)
    if (now_utc - entry_time).total_seconds() < 1800:  # less than 30 minutes
        print(f"⏳ {trade['symbol']}: Entry too recent (<30m), skipping")
        continue

    try:
        data = yf.download(
            symbol,
            interval="1m",
            start=entry_time,
            end=entry_time + timedelta(hours=3),
            progress=False,
            auto_adjust=False
        )

        if data.empty:
            print(f"⛔ {trade['symbol']}: No future data found.")
            collection.update_one(
                {"_id": trade["_id"]},
                {"$set": { "status": "no_data" }}
            )
            continue

        data = data.sort_index()

        # Find nearest time index to entry_time
        nearest_idx = data.index.get_indexer([entry_time], method='nearest')[0]
        future = data.iloc[nearest_idx + 1:]  # future candles only

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
