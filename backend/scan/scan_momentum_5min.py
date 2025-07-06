'''
This script scans NSE-listed stocks from the Nifty 500 to identify potential trade setups based on three technical conditions:

1.Previous Momentum: It detects stocks that exhibited strong bullish momentum in the recent past (based on 5-minute candles), characterized by at least 3 strong bullish candles within a 5-candle window.

2.Gap-Up Behavior: It checks if the stock had a gap-up of more than 2% compared to the previous day’s close and then moved near its 22-period EMA shortly after the gap-up.

3.Sustained EMA Slope: Independently of the above, it also scans for stocks whose EMA22 has been rising steadily (at least 5 continuous rises, each ≥0.1%) over the past 50 candles, and are now trading near the EMA — indicating a potential pullback or retest.

If any one of these three conditions is satisfied and the stock is currently near the 22 EMA, it is added to the final list.
'''



import yfinance as yf
import pandas as pd
import json
# from scipy.stats import linregress

# Read stock symbols from CSV file
df = pd.read_csv("scan/Nifty 500.csv")
symbols = df["SYMBOL"].dropna().unique()

momentum_retest_stocks = []

# Strategy parameters
momentum_length = 5
required_strong_candles = 3
ema_percent = 0.005  # 0.5% proximity threshold to EMA

for symbol in symbols:
    symbol_yf = symbol + ".NS"

    try:
        # Download 5-minute interval stock data for the last 15 days
        data = yf.download(
            tickers=symbol_yf,
            interval="5m",
            period="15d",
            auto_adjust=False,
            progress=False
        )

        # Skip if no data or missing columns
        if data.empty or "Close" not in data.columns:
            print(f"Skipping {symbol} due to bad data.")
            continue

        # Extract OHLC and calculate EMA22
        close = data["Close"]
        high = data["High"]
        open_ = data["Open"]
        volume = data["Volume"]
        ema22 = close.ewm(span=22, adjust=False).mean()

        # Combine relevant columns
        merged = pd.concat([open_, high, close, ema22], axis=1)
        merged.columns = ["Open", "High", "Close", "EMA22"]
        merged.dropna(inplace=True)

        if len(merged) < 60:
            continue  # Not enough data to evaluate

        # --- MOMENTUM CONDITION CHECK ---
        found_momentum = False
        for i in range(-65, -5):  # Look back from -65 to -5 candles
            window = merged.iloc[i - momentum_length + 1: i + 1]
            if len(window) < momentum_length:
                continue

            strong_candles = 0
            for j in range(momentum_length):
                c = window["Close"].iloc[j]
                o = window["Open"].iloc[j]
                prev_high = window["High"].iloc[j - 1] if j > 0 else o

                # Define a strong bullish candle
                if (c > o) and ((c - o) / o > 0.005) and (c > prev_high):
                    strong_candles += 1

            # If enough strong candles are found, mark momentum
            if strong_candles >= required_strong_candles:
                found_momentum = True
                break

        matched = False

        # --- MOMENTUM RETEST CONDITION ---
        if found_momentum:
            latest_close = float(merged["Close"].iloc[-1])
            latest_ema = float(merged["EMA22"].iloc[-1])
            # Check if current price is near EMA22
            if abs(latest_close - latest_ema) / latest_close < ema_percent:
                matched = True

        # --- GAP-UP CONDITION ---
        try:
            df_reset = data.reset_index()
            df_reset["Date"] = df_reset["Datetime"].dt.date
            grouped = df_reset.groupby("Date")
            dates = sorted(grouped.groups.keys())

            if len(dates) >= 2:
                yesterday = grouped.get_group(dates[-2])
                today = grouped.get_group(dates[-1])
                yesterday_close = float(yesterday["Close"].iloc[-1])
                open_today = float(today["Open"].iloc[0])
                gap_percent = (open_today - yesterday_close) / yesterday_close

                # If gap-up > 2%
                if gap_percent > 0.02:
                    # Check if price came near EMA after the gap
                    next_candles = merged.iloc[-60:-45]
                    for _, row in next_candles.iterrows():
                        c = float(row["Close"])
                        e = float(row["EMA22"])
                        if abs(c - e) / c < ema_percent:
                            matched = True
                            break

        except Exception as ge:
            print(f"Gap check failed for {symbol_yf}: {ge}")

        # --- EMA SLOPE BASED MOMENTUM RETEST ---

        # Get EMA22 values from 60 to 10 candles ago
        ema_past = merged["EMA22"].iloc[-60:-10].reset_index(drop=True)

        # Define a helper to check for rising EMA streak with minimum percentage increase
        def has_rising_streak(series, streak_required=5, min_step=0.001):
            streak = 0
            for i in range(1, len(series)):
                if series[i - 1] == 0:
                    continue  # Avoid divide-by-zero
                delta = (series[i] - series[i - 1]) / series[i - 1]
                if delta >= min_step:
                    streak += 1
                    if streak >= streak_required:
                        return True
                else:
                    streak = 0
            return False

        near_ema = False
        # If EMA22 was rising consistently in the past
        if has_rising_streak(ema_past, 5, 0.001):
            latest_close = float(merged["Close"].iloc[-1])
            latest_ema = float(merged["EMA22"].iloc[-1])

            # And now price is near the EMA again
            if abs(latest_close - latest_ema) / latest_ema < ema_percent:
                near_ema = True

        # If any condition matched, mark the stock
        if near_ema:
            matched = True

        # --- ADD TO FINAL LIST IF MATCHED ---
        if matched:
            momentum_retest_stocks.append({
                "symbol": symbol,
                "close": round(float(merged['Close'].iloc[-1]), 2),
                "ema22": round(float(merged['EMA22'].iloc[-1]), 2),
                "volume": int(data["Volume"].iloc[-1])
            })

    except Exception as e:
        print(f"Error with {symbol_yf}: {e}")

# Save results to JSON
with open("scan/results.json", "w") as f:
    json.dump(momentum_retest_stocks, f, indent=2)

print(f"\n Scan complete. {len(momentum_retest_stocks)} stock(s) matched the strategy.\n")
