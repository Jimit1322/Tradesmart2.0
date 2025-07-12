// src/components/Entrypage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const EntryPage = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: "linear-gradient(to bottom right, #0e1116, #1c1f2a)",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
        color: "#e0e3eb",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          textAlign: "center",
          background: "#1e222d",
          padding: "40px",
          borderRadius: "10px",
          boxShadow: "0 0 15px rgba(0,0,0,0.4)",
        }}
      >
        <h1 style={{ fontSize: "36px", marginBottom: "20px", color: "#26a69a" }}>
          Welcome to TradeSmart
          <p style={{ fontSize: "1.1rem", color: "#aab2bf" }}>
        Your personal intraday edge — powered by real strategies.
      </p>
        </h1>
       


        <div style={{ fontSize: "16px", marginBottom: "30px", lineHeight: "1.6", color: "#aab2bf" }}>
          <p>
            This scanner is based on a <strong>multi-timeframe momentum strategy</strong> that uses Exponential Moving Averages (EMAs) to detect potential long opportunities.
          </p>

          <p>📊 <strong>Strategy Overview:</strong></p>
          <ul style={{ textAlign: "left", margin: "20px auto", maxWidth: "500px", color: "#ccc", lineHeight: "1.6" }}>
            <li><strong>1-minute EMA9:</strong> Captures ultra-short-term momentum.</li>
            <li><strong>5-minute EMA22:</strong> Confirms short-term trend momentum.</li>
            <li><strong>Daily EMA44:</strong> Identifies long-term momentum and trend direction.</li>
          </ul>

          <p>
            ✅ Stocks are scanned when their price is trading above these EMAs, indicating bullish strength across timeframes.
          </p>

          <p>
            📈 Support & Resistance levels and 🔍 Entry/Stoploss/Target zones are visualized directly on the chart.
          </p>

          <p>
            This system helps identify stocks with strong potential for momentum breakouts — great for intraday and swing setups.
          </p>
        </div>

        <button
          onClick={() => navigate("/scan")}
          style={{
            padding: "14px 30px",
            fontSize: "16px",
            background: "#1e88e5",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            
            transition: "0.3s ease",
          }}
          onMouseOver={(e) => (e.target.style.boxShadow = "0 0 20px #1e88e5")}
          onMouseOut={(e) => (e.target.style.boxShadow = "0 0 10px #1e88e5aa")}
        >
          🔍 Start Scanning
        </button>
      </div>
    </div>
  );
};

export default EntryPage;
