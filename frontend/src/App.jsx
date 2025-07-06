/*
   Overview:
  This is the main component for the Stock Strategy Visualizer web app. It displays two dynamic tables of
  momentum stocks based on 1-minute and 5-minute strategies. Users can interactively view candlestick charts 
  with EMA overlays for any stock, as well as download CSV reports.

   What It Does:
  - Fetches scanned momentum stock lists from a backend API (`/api/scan`)
  - Separately handles:
    ▸ 5-min chart setup: strategy using EMA22 (for medium-term momentum)
    ▸ 1-min chart setup: strategy using EMA9 (for intraday scalping)
  - Displays two stock tables with:
    ▸ Symbol, Close Price, EMA value, Volume
    ▸ A "View" button to render lightweight candlestick charts
  - Each row expands to show a `StockChart` component when "View" is clicked
  - Provides a "Download CSV" option for exporting stock lists

   Use Case:
  This component is ideal for:
  - Viewing which stocks meet a specific momentum + EMA retest strategy
  - Quickly checking stock structure and volume behavior
  - Exporting trade setups for further analysis

   Notes:
  - Timeframes are synced to the chart component via the `tf` prop
  - Chart data is fetched via `/api/ohlc/:symbol?tf=5m|1m` for each selected row
  - Fully responsive and designed with Tailwind-inspired inline styles
*/


import React, { useEffect, useState } from "react";
import StockChart from "./StockChart.jsx";
import Navbar from "./components/Navbar.jsx";

const App = () => {
  const [data5m, setData5m] = useState([]);
  const [data1m, setData1m] = useState([]);
  const [selectedChart, setSelectedChart] = useState({ symbol: null, tf: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStocks = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:4000/api/scan");
        if (!res.ok) throw new Error("Failed to fetch stock data");
        const data = await res.json();
        console.log(data)
        setData5m(data["5m"] || []);
        setData1m(data["1m"] || []);
      } catch (err) {
        console.error("Error fetching stock list:", err.message);
        setError("Failed to load stock data.");
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  const downloadCSV = (stocks, label) => {
    const csv = ["Symbol,Close,EMA,Volume"];
    stocks.forEach(s => {
      csv.push(`${s.symbol},${s.close},${s.ema22 || s.ema9},${s.volume}`);
    });
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `momentum_${label}.csv`;
    a.click();
  };

  const renderTable = (stocks, label, emaLabel) => (
    <>
      <h2 style={{ textAlign: "center", color: "#004d40", marginTop: 40 }}>
        📈 {label} Momentum Stocks on {emaLabel}
      </h2>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <button
          onClick={() => downloadCSV(stocks, label.toLowerCase())}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            borderRadius: "6px",
            border: "1px solid #004d40",
            backgroundColor: "#e0f2f1",
            color: "#004d40",
            cursor: "pointer"
          }}
        >
          ⬇️ Download {label} CSV
        </button>
      </div>

      <table
        style={{
          margin: "0 auto",
          width: "100%",
          maxWidth: "900px",
          borderCollapse: "collapse",
          backgroundColor: "#ffffff",
          color: "#004d40",
          boxShadow: "0 0 10px rgba(0,0,0,0.05)"
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#b2ebf2" }}>
            <th style={thStyle}>Symbol</th>
            <th style={thStyle}>Close</th>
            <th style={thStyle}>{emaLabel}</th>
            <th style={thStyle}>Volume</th>
            <th style={thStyle}>Chart</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map(stock => (
            <React.Fragment key={`${stock.symbol}-${label}`}>
              <tr style={{ textAlign: "center" }}>
                <td style={tdStyle}>{stock.symbol}</td>
                <td style={tdStyle}>{stock.close}</td>
                <td style={tdStyle}>{label === "1-min" ? stock.ema9 : stock.ema22}</td>
                <td style={tdStyle}>{stock.volume}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() =>
                      setSelectedChart(prev =>
                        prev.symbol === stock.symbol && prev.tf === label ? { symbol: null, tf: null } : { symbol: stock.symbol, tf: label }
                      )
                    }
                    style={{
                      padding: "4px 10px",
                      backgroundColor: "#e0f7fa",
                      border: "1px solid #4dd0e1",
                      borderRadius: "4px",
                      cursor: "pointer",
                      color: "#006064"
                    }}
                  >
                    {selectedChart.symbol === stock.symbol && selectedChart.tf === label ? "Hide" : "View"}
                  </button>
                </td>
              </tr>
              {selectedChart.symbol === stock.symbol && selectedChart.tf === label && (
                <tr>
                  <td colSpan="5" style={{ padding: "20px" }}>
                    <div
                      style={{
                        border: "1px solid #e0f2f1",
                        padding: "10px",
                        backgroundColor: "#f9f9f9"
                      }}
                    >
                    <StockChart symbol={stock.symbol} tf={label === "1-min" ? "1m" : "5m"} />
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </>
  );

  return (
    <>
      <Navbar />
      <div style={{ padding: 20, backgroundColor: "#f0fdfd", minHeight: "100vh" }}>
        {loading && <p style={{ textAlign: "center" }}>Loading data...</p>}
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
        {!loading && !error && (
          <>
            {renderTable(data5m, "5-min", "EMA22")}
            {renderTable(data1m, "1-min", "EMA9")}
          </>
        )}
      </div>
    </>
  );
};

const thStyle = {
  padding: "12px",
  border: "1px solid #b2dfdb",
  fontWeight: "bold"
};

const tdStyle = {
  padding: "10px",
  border: "1px solid #e0f2f1"
};

export default App;
