/*
  StockChart.jsx

   Purpose:
  A reusable React component that renders a lightweight candlestick chart for a given stock symbol 
  using data served from a local API (`/api/ohlc/:symbol?tf=5m/1m`).

   Key Features:
  - Displays candlestick chart with optional volume histogram
  - Dynamically overlays 9 EMA (for 1-min) or 22 EMA (for 5-min) based on the `tf` prop
  - Hover/crosshair tooltips display OHLC, volume, and % change with time
  - Interactive toggle to show/hide volume histogram

   Props:
  - `symbol` (string): Stock symbol (e.g., "RELIANCE", "INFY")
  - `tf` (string): Timeframe, "1m" for intraday scalping, or "5m" for short-term momentum

   Tech Stack:
  - React + Hooks (useState, useEffect, useRef)
  - [lightweight-charts](https://tradingview.github.io/lightweight-charts/) library
  - Custom volume coloring and EMA overlay
  - Crosshair tooltip with real-time formatted data

  Expected JSON data format from backend:
  [
    {
      time: 1720252800,
      open: 2723.0,
      high: 2731.5,
      low: 2719.8,
      close: 2730.1,
      ema22: 2725.43, // or ema9 if interval is 1m
      volume: 38420
    },
    ...
  ]

   Use Case:
  Ideal for visualizing stock trading strategies such as momentum breakouts, EMA retests, 
  or gap-up setups in a technical analysis dashboard.
*/


import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";

const StockChart = ({ symbol, tf }) => {
  const chartContainerRef = useRef();
  const [showVolume, setShowVolume] = useState(true);
  const [timeframe, setTimeframe] = useState(tf || "5min"); // synced with prop
  const volumeSeriesRef = useRef();
  const chartRef = useRef();

  const emaLabel = timeframe === "1m" ? "ema9" : "ema22";
  const emaDisplay = timeframe === "1m" ? "9 EMA (1-min)" : "22 EMA (5-min)";

  // Sync timeframe with prop whenever tf changes
  useEffect(() => {
    setTimeframe(tf || "5min");
  }, [tf]);

  useEffect(() => {
    if (!symbol) return;

    const fetchChartData = async () => {
      try {
        const response = await fetch(
          `http://localhost:4000/api/ohlc/${symbol}?tf=${timeframe}`
        );
        const rawData = await response.json();

        if (!Array.isArray(rawData) || rawData.length === 0) {
          console.error("No chart data received for", symbol);
          return;
        }

        const candles = rawData.map((item) => ({
          time: item.time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }));

        const emaData = rawData
          .filter((item) => item[emaLabel] != null && !isNaN(item[emaLabel]))
          .map((item) => ({
            time: item.time,
            value: Number(item[emaLabel]),
          }));

        const volumedata = rawData.map((item) => ({
          time: item.time,
          value: item.volume,
          color: item.close > item.open ? "#26a69a" : "#ef5350",
        }));

        // Reset chart
        chartContainerRef.current.innerHTML = `
          <div id="chart-info-bar" style="
            display:flex;
            gap:3px;
            padding: 6px 12px;
            background: #e0f7fa;
            color: #004d40;
            font-size: 13px;
            font-family: Arial, sans-serif;
            border-bottom: 1px solid #ccc;
          ">
            Hover over a candle to see details...
          </div>
        `;
        const chartCanvasContainer = document.createElement("div");
        chartCanvasContainer.style.height = "480px";
        chartContainerRef.current.appendChild(chartCanvasContainer);

        const chart = createChart(chartCanvasContainer, {
          width: 1000,
          height: 500,
          layout: { background: { color: "#f0f8ff" }, textColor: "#333" },
          grid: {
            vertLines: { color: "#d3d3d3" },
            horzLines: { color: "#d3d3d3" },
          },
          rightPriceScale: { borderColor: "#71649C" },
          timeScale: { borderColor: "#71649C" },
        });

        chartRef.current = chart;

        const candleSeries = chart.addCandlestickSeries();
        candleSeries.setData(candles);

        const emaSeries = chart.addLineSeries({
          color: "#ff5733",
          lineWidth: 1.5,
        });
        emaSeries.setData(emaData);

        if (showVolume) {
          volumeSeriesRef.current = chart.addHistogramSeries({
            priceFormat: { type: "volume" },
            priceScaleId: "volume",
            scaleMargins: { top: 0, bottom: 0 },
          });
          volumeSeriesRef.current.setData(volumedata);

          chart.priceScale("volume").applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
          });
        }

        const infoBar = document.getElementById("chart-info-bar");
        chart.subscribeCrosshairMove((param) => {
          if (!param || !param.time || !param.seriesData) {
            infoBar.innerText = " Hover over a candle to see details...";
            return;
          }

          const data = param.seriesData.get(candleSeries);
          const volume = volumeSeriesRef.current
            ? param.seriesData.get(volumeSeriesRef.current)
            : null;

          if (!data) {
            infoBar.innerText = " Hover over a candle to see details...";
            return;
          }

          const { open, high, low, close } = data;
          const volumeValue = volume?.value ?? null;
          const changePercent = (((close - open) / open) * 100).toFixed(2);

          infoBar.innerHTML = `
            <b>Time:</b> ${new Date(param.time * 1000).toLocaleString()} &nbsp;|&nbsp;
            <b>O</b> ${open} &nbsp;|&nbsp;
            <b>H</b> ${high} &nbsp;|&nbsp;
            <b>L</b> ${low} &nbsp;|&nbsp;
            <b>C</b> ${close} &nbsp;|&nbsp;
            <b>Change:</b> ${changePercent}% ${
            volumeValue
              ? `&nbsp;|&nbsp;<b>Vol</b> ${volumeValue.toLocaleString()}`
              : ""
          }
          `;
        });
      } catch (error) {
        console.error("Error fetching chart data:", error);
      }
    };

    fetchChartData();
  }, [symbol, timeframe, showVolume]);

  return (
    <div style={{ marginTop: "2rem" }}>
      <h3 style={{ textAlign: "center", color: "#333" }}>
        📊 {symbol} Chart ({emaDisplay})
      </h3>

      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <button
          onClick={() => setShowVolume((prev) => !prev)}
          style={{
            padding: "4px 10px",
            background: "#f0f8ff",
            border: "1px solid #4dd0e1",
            borderRadius: "4px",
            cursor: "pointer",
            color: "#006064",
          }}
        >
          {showVolume ? "Hide" : "Show"} Volume
        </button>
      </div>

      <div
        ref={chartContainerRef}
        style={{
          width: "100%",
          height: "100%",
          background: "#f0f8ff",
          borderRadius: "8px",
          padding: "10px",
        }}
      />
    </div>
  );
};

export default StockChart;
