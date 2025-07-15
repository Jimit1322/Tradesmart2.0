from pymongo import MongoClient
import yfinance as yf
from datetime import datetime, timedelta, timezone,time
import pandas as pd

client = MongoClient("mongodb://localhost:27017")
db = client["tradesmart"]
collection = db["scan_5m"]

pending_trades = list(collection.find({ "strategy": "5m_momentum", "status": "pending" }))
no_hit_trades=list(collection.find({"strategy": "5m_momentum", "status": "no_hit"}))
print(f"🟡 Found {len(pending_trades) ,len(no_hit_trades)} pending trades to backtest...")

for trade in (pending_trades + no_hit_trades):
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
            interval="5m",
            start=entry_time,
            end=entry_time + timedelta(days=2),
            progress=False,
            auto_adjust=False
        )

        if data.empty:
            print(f"⛔ {symbol}: No data")
            collection.update_one({"_id": trade["_id"]}, {"$set": {"status": "no_data"}})
            continue

        # Find nearest candle
        data = data.sort_index()
        nearest_time = data.index[data.index.get_indexer([entry_time], method='nearest')[0]]
        start_idx = data.index.get_loc(nearest_time)

        if start_idx + 1 >= len(data):
            print(f"⚠️ {symbol}: No future candles after entry")
            continue

        future = data.iloc[start_idx + 1 :]  # All candles after entry

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
            {"$set": { "status": result, "backtest_time": datetime.utcnow().isoformat() }}
        )
        print(f"✅ {trade['symbol']} → {result}")
              
       
       

    except Exception as e:
        print(f"❌ Error processing {trade['symbol']}: {e}")

now_ist = datetime.now().astimezone().time()
market_close = time(15, 30)

if now_ist >= market_close:
    delete_result = collection.delete_many({
        "strategy": "5m_momentum",
        "status": { "$in": ["pending", "no_hit"] },
        "scan_date": datetime.now().strftime("%Y-%m-%d")
    })
    print(f"🗑️ Deleted {delete_result.deleted_count} stale trades after 3:30 PM")
else:
    print("⏳ Market still open — skipping cleanup")