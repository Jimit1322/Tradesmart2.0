import yfinance as yf
import pandas as pd
import json
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId
import helpers as hp

# --- MongoDB Setup ---
client = MongoClient("mongodb://localhost:27017")
db = client["tradesmart"]
collection = db["scan_1m"]

# --- Config ---
df = pd.read_csv("Nifty 500.csv")
symbols = df["SYMBOL"].dropna().unique()

momentum_length = 7
required_strong_candles = 4
ema_percent = 0.005
scan_date = datetime.now().strftime("%Y-%m-%d")

# Clean up old entries for today's scan


# --- Results ---
results = []

for symbol in symbols:
    symbol_yf = symbol + ".NS"

    try:
        data = yf.download(
            tickers=symbol_yf,
            interval="1m",
            period="8d",
            auto_adjust=False,
            progress=False
        )

        if data.empty or "Close" not in data.columns:
            print(f"Skipping {symbol} due to bad data.")
            continue

        # Calculate EMA9 and combine
        close = data["Close"]
        high = data["High"]
        open_ = data["Open"]
        volume = data["Volume"]
        ema9 = close.ewm(span=9, adjust=False).mean()

        merged = pd.concat([open_, high, close, ema9], axis=1)
        merged.columns = ["Open", "High", "Close", "EMA9"]
        merged.dropna(inplace=True)

        if len(merged) < 80:
            continue

        found = hp.check_momentum_condition_1min(
            merged,
            momentum_length,
            required_strong_candles,
            close_col="Close",
            open_col="Open",
            high_col="High",
            body_pct=0.003
        )

        if found:
            close_price = merged["Close"].iloc[-1]
            ema_price = merged["EMA9"].iloc[-1]
            entry = merged["Close"].iloc[-1]
            target = round(entry * 1.01, 2)
            stop_loss = round(entry * 0.995, 2)

            if abs(close_price - ema_price) / close_price < ema_percent:
                doc = {
                    "symbol": symbol,
                    "close": round(close_price, 2),
                    "ema9": round(ema_price, 2),
                    "volume": int(volume.iloc[-1]),
                    "timestamp": merged.index[-1].isoformat(),
                    "scan_date": scan_date,
                    "strategy": "1m_momentum",
                    "target": target,
                    "stop_loss": stop_loss,
                    "status": "pending" 
                }
                # results.append(doc)
                 # ✅ Upsert to avoid duplicates
                existing = collection.find_one({
                    "symbol": symbol,
                    "scan_date": scan_date,
                    "strategy": "1m_momentum"
                }) 
                if existing and existing.get("status") != "pending":
                    doc["status"] = existing["status"]  # preserve evaluated status
                else:
                    doc["status"] = "pending"

                collection.update_one(
                {
                    "symbol": symbol,
                    "scan_date": scan_date,
                    "strategy": "1m_momentum"
                },
                {"$set": doc},
                upsert=True
            )
                print(f"✅ {symbol} inserted")

    except Exception as e:
        print(f"⚠️ Error with {symbol_yf}: {e}")


# --- Optional: Save to JSON ---
# class MongoJSONEncoder(json.JSONEncoder):
#     def default(self, obj):
#         if isinstance(obj, (datetime, pd.Timestamp)):
#             return obj.isoformat()
#         if isinstance(obj, ObjectId):
#             return str(obj)
#         return super().default(obj)

# with open("results_1min.json", "w") as f:
#     json.dump(results, f, indent=2, cls=MongoJSONEncoder)

print(f"\n✅ 1-min Scan complete. {len(results)} stock(s) matched the strategy.\n")