import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";

const StockChart = ({ symbol }) => {
  const chartContainerRef = useRef();
  const [showvolume, setShowVolume] = useState(true);
  const volumeSeriesRef = useRef();
  const chartRef = useRef();

  useEffect(() => {
    if (!symbol) return;

   
   

    const fetchChartData = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/ohlc/${symbol}`);
        const rawData = await response.json();

        if (!Array.isArray(rawData) || rawData.length === 0) {
          console.error("No chart data received for", symbol);
          return;
        }

        const candles = rawData.map(item => ({
          time: item.time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }));

        const emaData = rawData
          .filter(item => item.ema22 != null && !isNaN(item.ema22))
          .map(item => ({
            time: item.time,
            value: Number(item.ema22),
          }));

        const volumedata = rawData.map(item => ({
          time: item.time,
          value: item.volume,
          color: item.close > item.open ? '#26a69a' : '#ef5350',
        }));

        // Clean previous chart
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
          layout: {
            background: { color: "#f0f8ff" },
            textColor: "#333",
          },
          grid: {
            vertLines: { color: "#d3d3d3" },
            horzLines: { color: "#d3d3d3" },
          },
          rightPriceScale: {
            borderColor: "#71649C",
          },
          timeScale: {
            borderColor: "#71649C",
          },
        });

        chartRef.current = chart;

        const candleSeries = chart.addCandlestickSeries();
        candleSeries.setData(candles);

        const emaSeries = chart.addLineSeries({
          color: "#ff5733",
          lineWidth: 1.5,
        });
        emaSeries.setData(emaData);

        if (showvolume) {
          volumeSeriesRef.current = chart.addHistogramSeries({
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
            scaleMargins: {
              top: 0,
              bottom: 0,
            },
          });
          volumeSeriesRef.current.setData(volumedata);

          chart.priceScale("volume").applyOptions({
            scaleMargins: {
              top: 0.8,
              bottom: 0,
            }
          });
        }

        const infoBar = document.getElementById("chart-info-bar");
        chart.subscribeCrosshairMove(param => {
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

          const { open, high, low, close ,} = data;
          const volumevalue = volume?.value ?? null;
          const changepercent = (((close - open) / open) * 100).toFixed(2);
        
          infoBar.innerHTML = `
          <b>Time:</b> ${new Date(param.time * 1000).toLocaleString()} &nbsp;|&nbsp;
          <b>O</b> ${open} &nbsp;|&nbsp;
          <b>H</b> ${high} &nbsp;|&nbsp;
          <b>L</b> ${low} &nbsp;|&nbsp;
          <b>C</b> ${close} &nbsp;|&nbsp;
          <b>Change:</b> ${changepercent}% ${
            volumevalue ? `&nbsp;|&nbsp;<b>Vol</b> ${volumevalue.toLocaleString()}` : ""
          }
          `;

          
         
        });

      } catch (error) {
        console.error("Error fetching chart data:", error);
      }
    };

    fetchChartData();

  
  }, [symbol, showvolume]);

  return (
    <div style={{ marginTop: "2rem" }}>
      <h3 style={{ textAlign: "center", color: "#333" }}>
        📊 Candlestick Chart: {symbol}
      </h3>
      <div style={{ marginBottom: 10 }}>
        <button
          onClick={() => setShowVolume(prev => !prev)}
          style={{
            background: "#f0f8ff",
            border: "1px solid #4dd0e1",
            borderRadius: "4px",
            padding: "4px 12px",
            cursor: "pointer",
            color: "#006064",
          }}
        >
          {showvolume ? "Hide" : "Show"} Volume
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
