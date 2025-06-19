import React, { useEffect, useState } from "react";
import StockChart from "./StockChart.jsx";
import Navbar from "./components/Navbar.jsx";

const App = () => {
  const [stocks, setStocks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStocks = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:4000/api/scan/listofstocks");
        if (!res.ok) throw new Error("Failed to fetch stock data");
        const data = await res.json();
        setStocks(data);
      } catch (err) {
        console.error("Error fetching stock list:", err.message);
        setError("Failed to load stock data.");
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  const downloadCSV = () => {
    const csv = ["Symbol,Close,EMA22,Volume"];
    stocks.forEach(s => {
      csv.push(`${s.symbol},${s.close},${s.ema22},${s.volume}`);
    });
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "momentum_stocks.csv";
    a.click();
  };

  return (
    <>
      <Navbar />
      <div style={{ padding: 20, backgroundColor: "#f0fdfd", minHeight: "100vh" }}>
        <h2 style={{ textAlign: "center", color: "#004d40" }}>
          📈 5-min Momentum Stocks on 22 EMA
        </h2>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <button
            onClick={downloadCSV}
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
            ⬇️ Download CSV
          </button>
        </div>

        {loading && <p style={{ textAlign: "center" }}>Loading data...</p>}
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

        {!loading && !error && (
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
                <th style={thStyle}>EMA22</th>
                <th style={thStyle}>Volume</th>
                <th style={thStyle}>Chart</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map(stock => (
                <React.Fragment key={stock.symbol}>
                  <tr style={{ textAlign: "center" }}>
                    <td style={tdStyle}>{stock.symbol}</td>
                    <td style={tdStyle}>{stock.close}</td>
                    <td style={tdStyle}>{stock.ema22}</td>
                    <td style={tdStyle}>{stock.volume}</td>
                    <td style={tdStyle}>
                      <button
                        onClick={() =>
                          setSelected(selected === stock.symbol ? null : stock.symbol)
                        }
                        style={{
                          padding: "4px 10px",
                          backgroundColor: "#e0f7fa",
                          border: "1px solid #4dd0e1",
                          borderRadius: "4px",
                          cursor: "pointer",
                          color: "#006064",
                        }}
                      >
                        {selected === stock.symbol ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>

                  {selected === stock.symbol && (
                    <tr>
                      <td colSpan="5" style={{ padding: "20px" }}>
                        <div
                          style={{
                            border: "1px solid #e0f2f1",
                            padding: "10px",
                            backgroundColor: "#f9f9f9",
                          }}
                        >
                          <StockChart symbol={stock.symbol} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
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
