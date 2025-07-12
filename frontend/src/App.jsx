import React, { useEffect, useState } from "react";
import StockChart from "./StockChart.jsx";
import Navbar from "./components/Navbar.jsx";
import { thStyle, tdStyle, downloadCSV } from "./helpers/stockUtils.js";

const App = () => {
  const [data5m, setData5m] = useState([]);
  const [data1m, setData1m] = useState([]);
  const [dataDaily, setDataDaily] = useState([]);
  const [selectedChart, setSelectedChart] = useState({ symbol: null, tf: null });
  const [loadingIntraday, setLoadingIntraday] = useState(true);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchIntraday = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/scan/intraday");
        if (!res.ok) throw new Error("Intraday API error");
        const intraday = await res.json();
        setData5m(intraday["5m"] || []);
        setData1m(intraday["1m"] || []);
      } catch (err) {
        console.error("❌ Intraday fetch error:", err.message);
        setError("Failed to fetch intraday data.");
      } finally {
        setLoadingIntraday(false);
      }
    };

    const fetchDaily = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/scan/daily");
        if (!res.ok) throw new Error("Daily API error");
        const daily = await res.json();
        setDataDaily(daily["daily"] || []);
      } catch (err) {
        console.error("❌ Daily fetch error:", err.message);
      } finally {
        setLoadingDaily(false);
      }
    };

    fetchIntraday();
    fetchDaily();
  }, []);

  const renderTable = (stocks, label, emaLabel) => (
    <>
      <h2 style={{ textAlign: "center", color: "#26a69a", marginTop: 40 }}>
        📈 {label} Stocks on {emaLabel}
      </h2>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <button
          onClick={() => downloadCSV(stocks, label.toLowerCase())}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            borderRadius: "6px",
            backgroundColor: "#2962ff",
            color: "#fff",
            border: "none",
            cursor: "pointer",
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
          backgroundColor: "#1e222d",
          color: "#e0e3eb",
          border: "1px solid #2c313d",
          borderRadius: "6px",
          overflow: "hidden",
          boxShadow: "0 0 10px rgba(0,0,0,0.4)",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#2a2f3a", color: "#aab2bf" }}>
            <th style={thStyle}>Symbol</th>
            <th style={thStyle}>Close</th>
            <th style={thStyle}>{emaLabel}</th>
            <th style={thStyle}>Volume</th>
            <th style={thStyle}>Chart</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => (
            <React.Fragment key={`${stock.symbol}-${label}`}>
              <tr style={{ textAlign: "center" }}>
                <td style={tdStyle}>{stock.symbol}</td>
                <td style={tdStyle}>{stock.close}</td>
                <td style={tdStyle}>
                  {label === "1-min"
                    ? stock.ema9
                    : label === "5-min"
                    ? stock.ema22
                    : stock.ema44}
                </td>
                <td style={tdStyle}>{stock.volume}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() =>
                      setSelectedChart((prev) =>
                        prev.symbol === stock.symbol && prev.tf === label
                          ? { symbol: null, tf: null }
                          : { symbol: stock.symbol, tf: label }
                      )
                    }
                    style={{
                      padding: "4px 10px",
                      backgroundColor: "#1e88e5",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      color: "#ffffff",
                      fontSize: "13px",
                    }}
                  >
                    {selectedChart.symbol === stock.symbol && selectedChart.tf === label
                      ? "Hide"
                      : "View"}
                  </button>
                </td>
              </tr>
              {selectedChart.symbol === stock.symbol && selectedChart.tf === label && (
                <tr>
                  <td colSpan="5" style={{ padding: "20px", backgroundColor: "#12161c" }}>
                    <div
                      style={{
                        border: "1px solid #2c313d",
                        padding: "10px",
                        backgroundColor: "#0e1116",
                        borderRadius: "6px",
                      }}
                    >
                      <StockChart
                        symbol={stock.symbol}
                        tf={
                          label === "1-min"
                            ? "1m"
                            : label === "5-min"
                            ? "5m"
                            : "1d"
                        }
                      />
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
      <Navbar onSearch={setSearchQuery} />
      <div style={{ padding: 20, backgroundColor: "#0e1116", minHeight: "100vh" }}>
        {error && <p style={{ color: "#ef5350", textAlign: "center" }}>{error}</p>}

        {loadingIntraday ? (
          <p style={{ textAlign: "center", color: "#aaa" }}>Loading 5-min & 1-min data...</p>
        ) : (
          <>
            {renderTable(
              data5m.filter((s) => s.symbol.includes(searchQuery.toUpperCase())),
              "5-min",
              "EMA22"
            )}
            {renderTable(
              data1m.filter((s) => s.symbol.includes(searchQuery.toUpperCase())),
              "1-min",
              "EMA9"
            )}
          </>
        )}

        {loadingDaily ? (
          <p style={{ textAlign: "center", color: "#aaa" }}>Loading Daily EMA44 data...</p>
        ) : (
          renderTable(
            dataDaily.filter((s) => s.symbol.includes(searchQuery.toUpperCase())),
            "Daily",
            "EMA44"
          )
        )}
      </div>
    </>
  );
};

export default App;
