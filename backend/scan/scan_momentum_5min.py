"""
This script scans NSE stocks for momentum setups and logs results to MongoDB.
Conditions:
1. Recent strong bullish candles
2. Gap-up + EMA retest
3. Sustained EMA22 slope + proximity
"""

import yfinance as yf
import pandas as pd
from datetime import datetime
import helpers as hp
from pymongo import MongoClient

# MongoDB Setup
client = MongoClient("mongodb://localhost:27017")
db = client["tradesmart"]
collection = db["scan_5m"]

# Load stock symbols (you can switch to Nifty 500 or custom list)
df = pd.read_csv("Nifty 500.csv")
symbols = df["SYMBOL"].dropna().unique()

# Parameters
momentum_length = 5
required_strong_candles = 3
ema_percent = 0.0035  # 0.35%
scan_date = datetime.now().strftime("%Y-%m-%d")
# collection.delete_many({"scan_date": scan_date, "strategy": "5m_momentum"})
# Run scan
for symbol in symbols:
    symbol_yf = symbol + ".NS"

    try:
        data = yf.download(
            tickers=symbol_yf,
            interval="5m",
            period="60d",
            auto_adjust=False,
            progress=False
        )

        if data.empty or "Close" not in data.columns:
            print(f"⚠️ Skipping {symbol}: No data.")
            continue

        # Compute EMA22 and merge
        close = data["Close"]
        high = data["High"]
        open_ = data["Open"]
        ema22 = close.ewm(span=22, adjust=False).mean()

        merged = pd.concat([open_, high, close, ema22], axis=1)
        merged.columns = ["Open", "High", "Close", "EMA22"]
        merged.dropna(inplace=True)
        

        if len(merged) < 60:
            continue

        matched = False
        
        
            
        

        # Condition 1: Momentum + EMA proximity
        if hp.check_momentum_condition(merged, momentum_length, required_strong_candles):
            
            if abs(merged["Close"].iloc[-1] - merged["EMA22"].iloc[-1]) / merged["Close"].iloc[-1] < ema_percent:
                matched = True

        # Condition 2: Gap-up + EMA retest
        if hp.check_gap_up_retest(data, merged, ema_percent):
            if abs(merged["Close"].iloc[-1] - merged["EMA22"].iloc[-1]) / merged["Close"].iloc[-1] < ema_percent:
                matched = True
           

        # Condition 3: EMA slope + EMA proximity
        if hp.check_ema_slope_condition(merged, ema_percent):
            matched = True

        if matched:
            entry = merged["Close"].iloc[-1]
            target = round(entry * 1.01, 2)
            stop_loss = round(entry * 0.995, 2)
            doc = {
                "symbol": symbol,
                "close": round(merged["Close"].iloc[-1], 2),
                "ema22": round(merged["EMA22"].iloc[-1], 2),
                "volume": int(data["Volume"].iloc[-1]),
                "timestamp": merged.index[-1].isoformat(),
                "scan_date": scan_date,
                "strategy": "5m_momentum",
                 "stop_loss": round(stop_loss,2),
                 "target":round(target,2),
                "status": "pending" 
            }

            # ✅ Upsert to avoid duplicates
            existing = collection.find_one({
                    "symbol": symbol,
                    "scan_date": scan_date,
                    "strategy": "5m_momentum"
                }) 
            if existing and existing.get("status") != "pending":
                    doc["status"] = existing["status"]  # preserve evaluated status
            else:
                    doc["status"] = "pending"

            collection.update_one(
                {
                    "symbol": symbol,
                    "scan_date": scan_date,
                    "strategy": "5m_momentum"
                },
                {"$set": doc},
                upsert=True
            )
            print(f"✅ {symbol} → logged to DB")

    except Exception as e:
        print(f"❌ Error with {symbol_yf}: {e}")

print(f"\n✅ Scan complete.\n") 