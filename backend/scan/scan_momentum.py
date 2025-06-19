import yfinance as yf
import pandas as pd
import json

# Load stock symbols
df = pd.read_csv("scan/listofstocks/Nifty 500.csv")
symbols = df["SYMBOL"].dropna().unique()

momentum_retest_stocks = []

# Parameters
momentum_length = 3
required_strong_candles = 3
ema_percent = 0.005

# Scan each symbol
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

        close = pd.Series(data["Close"].values.flatten(), index=data.index)
        high = pd.Series(data["High"].values.flatten(), index=data.index)
        open_ = pd.Series(data["Open"].values.flatten(), index=data.index)
        ema22 = close.ewm(span=22, adjust=False).mean()

        merged = pd.concat([open_, high, close, ema22], axis=1)
        merged.columns = ["Open", "High", "Close", "EMA22"]
        merged.dropna(inplace=True)
      
        if len(merged) < 40:
            continue

        found_momentum = False

        for i in range(-45, - 5):  
            window = merged.iloc[i - momentum_length + 1: i + 1]
            if len(window) < momentum_length:
                continue

            strong_candles = 0
            for j in range(momentum_length):
                c = window["Close"].iloc[j]
                o = window["Open"].iloc[j]
                if j == 0:
                    prev_high = o
                else:
                    prev_high = window["High"].iloc[j - 1]

                if (c > o) and ((c - o) / o > 0.003) and (c > prev_high):
                    strong_candles += 1

            if strong_candles >= required_strong_candles:
                found_momentum = True
                break
        print(found_momentum)
        if found_momentum:
            latest_close = merged["Close"].iloc[-1]
        
            latest_ema = merged["EMA22"].iloc[-1]

            if abs(latest_close - latest_ema) / latest_close < ema_percent:
                momentum_retest_stocks.append({
                    "symbol": symbol,
                    "close": round(latest_close, 2),
                    "ema22": round(latest_ema, 2),
                    "volume": int(data["Volume"].iloc[-1])
                })

    except Exception as e:
        print(f"Error with {symbol_yf}: {e}")


with open("scan/results.json", "w") as f:
    json.dump(momentum_retest_stocks, f, indent=2)

print(f"\nScan complete. {len(momentum_retest_stocks)} stock(s) matched the strategy.\n")
