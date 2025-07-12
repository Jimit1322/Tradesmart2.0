"""
This script scans NSE stocks for potential momentum setups using:
1. Recent strong bullish candles (momentum detection)
2. Gap-up + EMA retest behavior
3. Sustained rising EMA22 slope with proximity to EMA

If any condition is met and the stock is near EMA22, it is included in the result.
"""

import yfinance as yf
import pandas as pd
import json
import helpers as hp

# Load stock symbols
df = pd.read_csv("Nifty 500.csv")
symbols = df["SYMBOL"].dropna().unique()

# Strategy parameters
momentum_length = 5
required_strong_candles = 3
ema_percent = 0.005  # 0.5% proximity to EMA

# Final results list
momentum_retest_stocks = []

for symbol in symbols:
    symbol_yf = symbol + ".NS"

    try:
        # Get last 60 days of 5-min data
        data = yf.download(
            tickers=symbol_yf,
            interval="5m",
            period="60d",
            auto_adjust=False,
            progress=False
        )

        if data.empty or "Close" not in data.columns:
            print(f"Skipping {symbol} — No valid data.")
            continue

        # Prepare OHLC + EMA22
        close = data["Close"]
        high = data["High"]
        open_ = data["Open"]
        volume = data["Volume"]
        ema22 = close.ewm(span=22, adjust=False).mean()
        merged = pd.concat([open_, high, close, ema22], axis=1)
        merged.columns = ["Open", "High", "Close", "EMA22"]
        merged.dropna(inplace=True)
       
       
        if len(merged) < 60:
            continue  # not enough candles

        matched = False

        # --- CONDITION 1: Recent Momentum + Retest ---
        if hp.check_momentum_condition(merged, momentum_length, required_strong_candles):
            latest_close = merged["Close"].iloc[-1]
            latest_ema = merged["EMA22"].iloc[-1]
            if abs(latest_close - latest_ema) / latest_close < ema_percent:
                matched = True

        # --- CONDITION 2: Gap-up + EMA Retest ---
        if hp.check_gap_up_retest(data, merged, ema_percent):
            matched = True

        # --- CONDITION 3: Sustained EMA22 Slope + Proximity ---
        if  hp.check_ema_slope_condition(merged, ema_percent):
            matched = True

        # --- Final Stock Add ---
        if matched:
            momentum_retest_stocks.append({
                "symbol": symbol,
                "close": round(merged["Close"].iloc[-1], 2),
                "ema22": round(merged["EMA22"].iloc[-1], 2),
                "volume": int(data["Volume"].iloc[-1])
            })

    except Exception as e:
        print(f"⚠️ Error with {symbol_yf}: {e}")

# Export results
with open("results.json", "w") as f:
    json.dump(momentum_retest_stocks, f, indent=2)

print(f"\n✅ Scan complete. {len(momentum_retest_stocks)} stock(s) matched the strategy.\n")
