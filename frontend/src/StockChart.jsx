import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";

const StockChart = ({ symbol, tf }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const volumeSeriesRef = useRef();

  const [timeframe, setTimeframe] = useState(tf || "5m");
  const [showVolume, setShowVolume] = useState(true);
  const [showEma9, setShowEma9] = useState(timeframe === "1m");
  const [showEma22, setShowEma22] = useState(timeframe === "5m");
  const [showEma44, setShowEma44] = useState(timeframe === "1d");
  const [showRR, setShowRR] = useState(true);
  const [illiquidWarning, setIlliquidWarning] = useState("");
  const [entrySLTargetMap, setEntrySLTargetMap] = useState({});
  
  const getEntrySlTarget = (symbol, timeframe, lastClose) => {
    const key = `${symbol}-${timeframe}`;
    if (entrySLTargetMap[key]) {
      return entrySLTargetMap[key];
    }
  
    let entryPrice = lastClose;
    let sl = 0, target = 0;
  
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
  
    const fixed = { entryPrice, sl, target };
    setEntrySLTargetMap(prev => ({ ...prev, [key]: fixed }));
    return fixed;
  };

  useEffect(() => {
    setTimeframe(tf || "5m");
  }, [tf]);
  
  const detectPivotLevels = (data, windowSize = 5) => {
    const levels = [];
    const threeYearsAgo = Date.now() / 1000 - 3 * 365 * 24 * 60 * 60;
    const recentData = data.filter(candle => candle.time >= threeYearsAgo);

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
    const finalLevels = [];
    for (let i = 0; i < sorted.length && finalLevels.length < maxLevels; i += step) {
      finalLevels.push(sorted[i]);
    }
    return finalLevels;
  };

  useEffect(() => {
    if (!symbol) return;

    const fetchChartData = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/ohlc/${symbol}?tf=${timeframe}`);

        const rawData = await response.json();
        if (!Array.isArray(rawData) || rawData.length === 0) {
          console.error("No chart data received for", symbol);
          return;
        }
        // Use last ~30 candles for any TF
        const recentCandles = rawData.slice(-30);

        // Calculate average traded value (₹volume = close × volume)
        const avgRupeeVolume = recentCandles.reduce((sum, d) => sum + (d.close * d.volume), 0) / recentCandles.length;

        // Count flat candles (no movement)
        const flatCandles = recentCandles.filter(c => c.open === c.close && c.high === c.low);

        // Dynamic threshold: higher TF stocks may have more ₹volume even with fewer trades
        let volumeThreshold = 100000;
        let flatCandleThreshold = 10;

        if (timeframe === "1m") {
          volumeThreshold = 50000;
          flatCandleThreshold = 6;
        } else if (timeframe === "1d") {
          volumeThreshold = 500000;
          flatCandleThreshold = 1; // rarely flat, so just 1
        }

        if (avgRupeeVolume < volumeThreshold && flatCandles.length >= flatCandleThreshold) {
          setIlliquidWarning("⚠️ Illiquid Stock: Low traded value and flat price movement.");
        } else {
          setIlliquidWarning("");
        }





        const candles = rawData.map(item => ({
          time: item.time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }));

        const getEMAData = (label) => rawData.filter(item => item[label] != null && !isNaN(item[label])).map(item => ({ time: item.time, value: Number(item[label]) }));

        const ema9 = getEMAData("ema9");
        const ema22 = getEMAData("ema22");
        const ema44 = getEMAData("ema44");

        const volumedata = rawData.map(item => ({
          time: item.time,
          value: item.volume,
          color: item.close > item.open ? "#26a69a" : "#ef5350",
        }));

        chartContainerRef.current.innerHTML = `<div id="chart-info-bar" style="padding: 6px 12px;background: #1e222d;color: #aab2bf;font-size: 13px;font-family: monospace;border-bottom: 1px solid #2c313d;">Hover over a candle to see details...</div>`;

        const chartCanvas = document.createElement("div");
        chartCanvas.style.height = "480px";
        chartContainerRef.current.appendChild(chartCanvas);

        const chart = createChart(chartCanvas, {
          width: 1000,
          height: 500,
          layout: { background: { color: "#0e1116" }, textColor: "#aab2bf" },
          grid: { vertLines: { color: "#2c313d" }, horzLines: { color: "#2c313d" } },
          rightPriceScale: { borderColor: "#2c313d" },
          timeScale: { borderColor: "#2c313d" },
        });

        chartRef.current = chart;

        const candleSeries = chart.addCandlestickSeries({
          upColor: "#26a69a",
          downColor: "#ef5350",
          borderVisible: false,
          wickUpColor: "#26a69a",
          wickDownColor: "#ef5350",
        });
        candleSeries.setData(candles);

        if (showRR) {
          const lastCandle = candles[candles.length - 1];
          const { entryPrice, sl, target } = getEntrySlTarget(symbol, timeframe, lastCandle.close);


          candleSeries.createPriceLine({ price: entryPrice, color: "#00bcd4", lineStyle: 3, lineWidth: 1, axisLabelVisible: true, title: `Entry: ₹${entryPrice.toFixed(2)}` });
          candleSeries.createPriceLine({ price: sl, color: "#ef5350", lineStyle: 0, lineWidth: 1, axisLabelVisible: true, title: `SL: ₹${sl.toFixed(2)}` });
          candleSeries.createPriceLine({ price: target, color: "#66bb6a", lineStyle: 0, lineWidth: 1, axisLabelVisible: true, title: `Target: ₹${target.toFixed(2)}` });




        }

        detectPivotLevels(candles).forEach(level => {
          candleSeries.createPriceLine({ price: level, color: "#ffffff", lineWidth: 1, lineStyle: 0, axisLabelVisible: true });
        });

        if (showEma9) chart.addLineSeries({ color: "#00bcd4", lineWidth: 1.5, priceLineVisible: false }).setData(ema9);
        if (showEma22) chart.addLineSeries({ color: "#f39c12", lineWidth: 1.5, priceLineVisible: false }).setData(ema22);
        if (showEma44) chart.addLineSeries({ color: "#ab47bc", lineWidth: 1.5, priceLineVisible: false }).setData(ema44);

        if (showVolume) {
          volumeSeriesRef.current = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "volume", scaleMargins: { top: 0, bottom: 0 } });
          volumeSeriesRef.current.setData(volumedata);
          chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        }

        const infoBar = document.getElementById("chart-info-bar");
        chart.subscribeCrosshairMove((param) => {
          if (!param || !param.time || !param.seriesData) {
            infoBar.innerText = "Hover over a candle to see details...";
            return;
          }

          const data = param.seriesData.get(candleSeries);
          const volume = volumeSeriesRef.current ? param.seriesData.get(volumeSeriesRef.current) : null;
          if (!data) return;

          const { open, high, low, close } = data;
          const changePercent = (((close - open) / open) * 100).toFixed(2);
          const volumeValue = volume?.value ?? null;

          infoBar.innerHTML = `<b>Time:</b> ${new Date(param.time * 1000).toLocaleString()} &nbsp;|&nbsp;<b>O</b> ${open} &nbsp;|&nbsp;<b>H</b> ${high} &nbsp;|&nbsp;<b>L</b> ${low} &nbsp;|&nbsp;<b>C</b> ${close} &nbsp;|&nbsp;<b>Δ:</b> ${changePercent}% ${volumeValue ? `&nbsp;|&nbsp;<b>Vol</b> ${volumeValue.toLocaleString()}` : ""}`;
        });


      } catch (error) {
        console.error("Error fetching chart data:", error);
      }
    };



    fetchChartData();
  }, [symbol, timeframe, showVolume, showEma9, showEma22, showEma44, showRR,entrySLTargetMap,illiquidWarning]);

  return (
    <div style={{ marginTop: "2rem" }}>
      <h3 style={{ textAlign: "center", color: "#26a69a" }}>📊 {symbol} Chart</h3>

      {illiquidWarning && (
        <div style={{
          textAlign: "center",
          background: "#2c2f3a",
          color: "#f39c12",
          fontSize: "13px",
          padding: "6px",
          borderRadius: "6px",
          margin: "10px auto",
          width: "fit-content"
        }}>
          {illiquidWarning}
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <button onClick={() => setShowVolume(prev => !prev)} style={{ marginRight: "8px", padding: "6px 12px", background: "#1e88e5", border: "none", borderRadius: "4px", cursor: "pointer", color: "#fff", fontSize: "13px" }}>
          {showVolume ? "Hide Volume" : "Show Volume"}
        </button>
        <label style={{ color: "#ccc", marginRight: 10 }}>
          <input type="checkbox" checked={showEma9} onChange={() => setShowEma9(!showEma9)} /> EMA9
        </label>
        <label style={{ color: "#ccc", marginRight: 10 }}>
          <input type="checkbox" checked={showEma22} onChange={() => setShowEma22(!showEma22)} /> EMA22
        </label>
        <label style={{ color: "#ccc", marginRight: 10 }}>
          <input type="checkbox" checked={showEma44} onChange={() => setShowEma44(!showEma44)} /> EMA44
        </label>
        <label style={{ color: "#ccc" }}>
          <input type="checkbox" checked={showRR} onChange={() => setShowRR(!showRR)} /> Entry/SL/Target
        </label>
      </div>

      <div
        ref={chartContainerRef}
        style={{
          width: "100%",
          height: "100%",
          background: "#1e222d",
          borderRadius: "8px",
          padding: "10px",
          boxShadow: "0 0 10px rgba(0,0,0,0.5)"
        }}
      />
    </div>

  );
};

export default StockChart; 