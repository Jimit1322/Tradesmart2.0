'''
It scans the stocks which were perivously in momentum and also scan the stocks which are gap up 
If both condition satisfy the stocks which are  currently near the 22ema it adds to the list 
'''

import yfinance as yf
import pandas as pd
import json

df = pd.read_csv("scan/Nifty 500.csv")
symbols = df["SYMBOL"].dropna().unique()

momentum_retest_stocks = []

momentum_length = 5
required_strong_candles = 3
ema_percent = 0.005

for symbol in symbols:
    symbol_yf = symbol + ".NS"

    try:
        data = yf.download(
            tickers=symbol_yf,
            interval="5m",
            period="15d",
            auto_adjust=False,
            progress=False
        )

        if data.empty or "Close" not in data.columns:
            print(f"Skipping {symbol} due to bad data.")
            continue

        close = data["Close"]
        high = data["High"]
        open_ = data["Open"]
        ema22 = close.ewm(span=22, adjust=False).mean()

        merged = pd.concat([open_, high, close, ema22], axis=1)
        merged.columns = ["Open", "High", "Close", "EMA22"]
        merged.dropna(inplace=True)

        if len(merged) < 60:
            continue
        
        #Found-momentum condition
        found_momentum = False
        for i in range(-65, -5):
            window = merged.iloc[i - momentum_length + 1: i + 1]
            if len(window) < momentum_length:
                continue

            strong_candles = 0
            for j in range(momentum_length):
                c = window["Close"].iloc[j]
                o = window["Open"].iloc[j]
                prev_high = window["High"].iloc[j - 1] if j > 0 else o

                if (c > o) and ((c - o) / o > 0.005) and (c > prev_high):
                    strong_candles += 1

            if strong_candles >= required_strong_candles:
                found_momentum = True
                break

        matched = False
        if found_momentum:
            latest_close = float(merged["Close"].iloc[-1])
            latest_ema = float(merged["EMA22"].iloc[-1])
            if abs(latest_close - latest_ema) / latest_close < ema_percent:
                matched = True

        #  GAP-UP CONDITION
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

                if gap_percent > 0.02:
                    next_candles = merged.iloc[-60:-45]
                    for _, row in next_candles.iterrows():
                        c =float(row["Close"])
                        e = float(row["EMA22"])
                        if abs(c - e) / c < ema_percent:
                            matched = True
                            break
        except Exception as ge:
            print(f"Gap check failed for {symbol_yf}: {ge}")

        if matched:
            momentum_retest_stocks.append({
                "symbol": symbol,
                "close": round(float(merged['Close'].iloc[-1]), 2),
                "ema22": round(float(merged['EMA22'].iloc[-1]), 2),
                "volume":int(data["Volume"].iloc[-1])
            })

    except Exception as e:
        print(f"Error with {symbol_yf}: {e}")

with open("scan/results.json", "w") as f:
    json.dump(momentum_retest_stocks, f, indent=2)

print(f"\n Scan complete. {len(momentum_retest_stocks)} stock(s) matched the strategy.\n")
