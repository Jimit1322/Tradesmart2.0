

export const thStyle = {
    padding: "12px",
    borderBottom: "1px solid #2c313d",
    fontWeight: "bold",
  };
  
export const tdStyle = {
    padding: "10px",
    borderBottom: "1px solid #2c313d",
  };
  
export const downloadCSV = (stocks, label) => {
    const csv = ["Symbol,Close,EMA,Volume"];
    stocks.forEach((s) => {
      const ema = s.ema22 || s.ema9 || s.ema44 || "";
      csv.push(`${s.symbol},${s.close},${ema},${s.volume}`);
    });
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `momentum_${label}.csv`;
    a.click();
  };
  
 

// src/helpers/stockUtils.js

export const getEntrySlTarget = (key, lastClose, map, setMap, timeframe) => {
  if (map[key]) return map[key];

  const entryPrice = lastClose;
  let sl, target;

  if (timeframe === "5m") {
    sl = entryPrice * 0.995;
    target = entryPrice * 1.01;
  } else if (timeframe === "1d") {
    sl = entryPrice * 0.92;
    target = entryPrice * 1.15;
  } else {
    sl = entryPrice * 0.99;
    target = entryPrice * 1.02;
  }

  const result = { entryPrice, sl, target };
  setMap((prev) => ({ ...prev, [key]: result }));
  return result;
};

export const detectPivotLevels = (data, windowSize = 5) => {
  const levels = [];
  const threeYearsAgo = Date.now() / 1000 - 3 * 365 * 24 * 60 * 60;
  const recentData = data.filter(c => c.time >= threeYearsAgo);

  for (let i = windowSize; i < recentData.length - windowSize; i++) {
    const slice = recentData.slice(i - windowSize, i + windowSize + 1);
    const highs = slice.map(c => c.high);
    const lows = slice.map(c => c.low);
    const isHighPivot = recentData[i].high === Math.max(...highs);
    const isLowPivot = recentData[i].low === Math.min(...lows);

    if (isHighPivot || isLowPivot) {
      const price = isHighPivot ? recentData[i].high : recentData[i].low;
      if (levels.every(lvl => Math.abs(lvl - price) > price * 0.005)) {
        levels.push(price);
      }
    }
  }

  const sorted = levels.sort((a, b) => a - b);
  const maxLevels = 6;
  const step = Math.max(1, Math.floor(sorted.length / maxLevels));
  return sorted.filter((_, idx) => idx % step === 0).slice(0, maxLevels);
};

export const checkIlliquidity = (rawData, timeframe) => {
  const recentCandles = rawData.slice(-30);
  const avgRupeeVolume = recentCandles.reduce((sum, d) => sum + d.close * d.volume, 0) / recentCandles.length;
  const flatCandles = recentCandles.filter(c => c.open === c.close && c.high === c.low);

  let volumeThreshold = 100000;
  let flatCandleThreshold = 10;

  if (timeframe === "1m") {
    volumeThreshold = 100000;
    flatCandleThreshold = 6;
  } else if (timeframe === "1d") {
    volumeThreshold = 500000;
    flatCandleThreshold = 1;
  }

  if (avgRupeeVolume < volumeThreshold || flatCandles.length >= flatCandleThreshold) {
    return { warning: "⚠️ Illiquid Stock: Low traded value and flat price movement." };
  }

  return { warning: "" };
};
