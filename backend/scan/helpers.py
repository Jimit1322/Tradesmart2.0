
"""
Helper functions for the Momentum + EMA Retest Stock Scanner.
This module provides reusable utility functions to evaluate technical conditions
used in the strategy

"""
def has_rising_streak(series, streak_required=5, min_step=0.001):
    """
    Checks for a rising streak in a series where each increase is ≥ min_step (e.g., 0.1%).
    """
    streak = 0
    for i in range(1, len(series)):
        prev, curr = series[i - 1], series[i]
        if prev == 0:
            continue
        if (curr - prev) / prev >= min_step:
            streak += 1
            if streak >= streak_required:
                return True
        else:
            streak = 0
    return False


def check_momentum_condition(merged, momentum_length=5, required_strong_candles=3):
    """
    Scans for at least N strong bullish candles within a sliding window of recent data.
    """
    for i in range(-65, -5):
        window = merged.iloc[i - momentum_length + 1: i + 1]
        if len(window) < momentum_length:
            continue

        strong_candles = 0
        for j in range(momentum_length):
            o = window["Open"].iloc[j]
            c = window["Close"].iloc[j]
            prev_high = window["High"].iloc[j - 1] if j > 0 else o

            if (c > o) and ((c - o) / o > 0.005) and (c > prev_high):
                strong_candles += 1

        if strong_candles >= required_strong_candles:
            return True

    return False


def check_gap_up_retest(data, merged, ema_percent=0.005):
    """
    Checks for gap-up > 2% and if price comes close to EMA shortly after the gap.
    """
    try:
        df_reset = data.reset_index()
        df_reset["Date"] = df_reset["Datetime"].dt.date
        grouped = df_reset.groupby("Date")
        dates = sorted(grouped.groups.keys())

        if len(dates) < 2:
            return False

        yesterday = grouped.get_group(dates[-2])
        today = grouped.get_group(dates[-1])
        y_close = float(yesterday["Close"].iloc[-1])
        o_today = float(today["Open"].iloc[0])
        gap = (o_today - y_close) / y_close

        if gap > 0.03:
            return True
          
                  

    except Exception as e:
        print(f"Gap up check failed: {e}")

    return False



def check_ema_slope_condition(merged, ema_percent=0.005):
    """
    Checks if EMA22 was rising steadily and the current price is near EMA22.
    """
    try:
        ema_past = merged["EMA22"].iloc[-60:-10].reset_index(drop=True)
        if has_rising_streak(ema_past, streak_required=5, min_step=0.001):
            latest_close = merged["Close"].iloc[-1]
            latest_ema = merged["EMA22"].iloc[-1]
            if abs(latest_close - latest_ema) / latest_ema < ema_percent:
                return True
    except:
        pass

    return False


# For-1min

def check_momentum_condition_1min(
    df, momentum_length=5, required_strong_candles=3,
    close_col="Close", open_col="Open", high_col="High", body_pct=0.005
):
    """
    Detects recent bullish momentum based on a sliding window.
    A strong candle = close > open + body% and close > prev high.
    """
    for i in range(-85, -5):
        window = df.iloc[i - momentum_length + 1 : i + 1]
        if len(window) < momentum_length:
            continue

        strong_candles = 0
        for j in range(momentum_length):
            c = window[close_col].iloc[j]
            o = window[open_col].iloc[j]
            prev_high = window[high_col].iloc[j - 1] if j > 0 else o

            if (c > o) and ((c - o) / o > body_pct) and (c > prev_high):
                strong_candles += 1

        if strong_candles >= required_strong_candles:
            return True

    return False


