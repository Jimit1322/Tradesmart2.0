"""
This script scans NSE-listed stocks from the Nifty 500 using 1-minute interval data over the past 7 days.

It identifies stocks that:
1. Showed **recent strong bullish momentum**, defined as at least 4 out of the last 5 candles (within a rolling window)
   where:
   - The candle closed higher than it opened
   - The candle's body size was > 0.3%
   - The close broke above the previous candle's high

2. Are now **trading near their 9-period EMA**, indicating a potential pullback or retest opportunity.

If both conditions are met, the stock is added to the result list with its current close price, EMA value, and volume.

The matched stocks are saved to a JSON file: 'scan/results_1min.json'.
"""

"""
This script scans NSE stocks for 1-minute momentum setups using:
1. Recent strong bullish candles
2. Price trading near EMA9

Stocks matching both are exported to 'results_1min.json'
"""

import yfinance as yf
import pandas as pd
import json
import helpers as hp

# Load stock symbols
df = pd.read_csv("Nifty 500.csv")
symbols = df["SYMBOL"].dropna().unique()

momentum_length = 7
required_strong_candles = 4
ema_percent = 0.005

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
            merged, momentum_length, required_strong_candles,
            close_col="Close", open_col="Open", high_col="High", body_pct=0.003
        )

        if found:
            close_price = merged["Close"].iloc[-1]
            ema_price = merged["EMA9"].iloc[-1]
            if abs(close_price - ema_price) / close_price < ema_percent:
                results.append({
                    "symbol": symbol,
                    "close": round(close_price, 2),
                    "ema9": round(ema_price, 2),
                    "volume": int(volume.iloc[-1])
                })

    except Exception as e:
        print(f"⚠️ Error with {symbol_yf}: {e}")

with open("results_1min.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"\n✅ 1-min Scan complete. {len(results)} stock(s) matched the strategy.\n")

            
        
        
    

