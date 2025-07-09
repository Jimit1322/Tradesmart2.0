"""
📈 Daily 44 EMA Scanner

This script scans NSE-listed stocks from the Nifty 500 to identify potential trade setups
where the stock is currently near its 44-period EMA on the daily timeframe.

Use case: Swing trade setups aligning with a medium-term trend pullback.
"""

import yfinance as yf
import pandas as pd
import json
import os

# Load stock symbols
df = pd.read_csv("Nifty 500.csv")
symbols = df["SYMBOL"].dropna().unique()

daily_44ema_stocks = []
ema_percent = 0.01  # 1% proximity
trades = 0

for symbol in symbols:
    symbol_yf = symbol + ".NS"

    try:
        # Download 90 daily candles for EMA44
        data = yf.download(
            tickers=symbol_yf,
            interval="1d",
            period="120d",
            auto_adjust=False,
            progress=False
        )

        if data.empty or "Close" not in data.columns:
            print(f"⏩ Skipping {symbol} — no data.")
            continue

        close = data["Close"]
        high = data["High"]
        open_ = data["Open"]
        volume = data["Volume"]
        ema44 = close.ewm(span=44, adjust=False).mean()

        merged = pd.concat([open_, close, high, ema44, volume], axis=1)
        merged.columns = ["Open", "Close", "High", "EMA44", "Volume"]
        merged.dropna(inplace=True)

        if len(merged) < 50:
            print(f"⚠️ Not enough candles for {symbol} after dropna.")
            continue

        # Latest candle values
        latest = merged.iloc[-1]
        latest_close = float(latest["Close"])
        latest_ema = float(latest["EMA44"])
        latest_vol = int(latest["Volume"])
        
        if latest_close-latest_ema<0:
            continue
        
        distance = abs(latest_close - latest_ema) / latest_close

        if distance < ema_percent:
            print(f"✅ {symbol} matched | Close: {latest_close}, EMA44: {latest_ema}")
            daily_44ema_stocks.append({
                "symbol": symbol,
                "close": round(latest_close, 2),
                "ema44": round(latest_ema, 2),
                "volume": latest_vol
            })
            trades += 1
        else:
            print(f"— {symbol} skipped: Distance too far ({distance:.2%})")

    except Exception as e:
        print(f"❌ Error with {symbol_yf}: {e}")

# Save to JSON

with open("results_44_daily.json", "w") as f:
    json.dump(daily_44ema_stocks, f, indent=2)

print(f"\n📦 Daily 44 EMA Scan complete. {trades} stock(s) matched.\n")
