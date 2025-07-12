import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import {
  getEntrySlTarget,
  detectPivotLevels,
  checkIlliquidity,
} from "./helpers/stockUtils";

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

  useEffect(() => {
    setTimeframe(tf || "5m");
  }, [tf]);

  useEffect(() => {
    if (!symbol) return;

    const fetchChartData = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/ohlc/${symbol}?tf=${timeframe}`);
        const rawData = await response.json();
        if (!Array.isArray(rawData) || rawData.length === 0) return;

        const { warning } = checkIlliquidity(rawData, timeframe);
        setIlliquidWarning(warning);

        const candles = rawData.map(item => ({
          time: item.time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }));

        const getEMAData = (label) =>
          rawData.filter(item => item[label] != null && !isNaN(item[label]))
            .map(item => ({ time: item.time, value: Number(item[label]) }));

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
          const key = `${symbol}-${timeframe}`;
          const { entryPrice, sl, target } = getEntrySlTarget(
            key,
            lastCandle.close,
            entrySLTargetMap,
            setEntrySLTargetMap,
            timeframe
          );

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
        console.error("Chart error:", error);
      }
    };

    fetchChartData();
  }, [symbol, timeframe, showVolume, showEma9, showEma22, showEma44, showRR]);

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
        <button onClick={() => setShowVolume((prev) => !prev)} style={{ marginRight: "8px", padding: "6px 12px", background: "#1e88e5", border: "none", borderRadius: "4px", cursor: "pointer", color: "#fff", fontSize: "13px" }}>
          {showVolume ? "Hide Volume" : "Show Volume"}
        </button>
        <label style={{ color: "#ccc", marginRight: 10 }}><input type="checkbox" checked={showEma9} onChange={() => setShowEma9(!showEma9)} /> EMA9</label>
        <label style={{ color: "#ccc", marginRight: 10 }}><input type="checkbox" checked={showEma22} onChange={() => setShowEma22(!showEma22)} /> EMA22</label>
        <label style={{ color: "#ccc", marginRight: 10 }}><input type="checkbox" checked={showEma44} onChange={() => setShowEma44(!showEma44)} /> EMA44</label>
        <label style={{ color: "#ccc" }}><input type="checkbox" checked={showRR} onChange={() => setShowRR(!showRR)} /> Entry/SL/Target</label>
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
