import React from "react";

const Navbar = ({ onSearch }) => {
  return (
    <div
      style={{
        background: "#0d1117", // Dark trading background
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        borderBottom: "1px solid #21262d",
        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.4)",
      }}
    >
      <h1
        style={{
          color: "#39d353", // Green trading accent
          fontSize: "22px",
          fontWeight: "600",
          margin: 0,
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        TradeSmart
      </h1>

      <input
        type="text"
        placeholder="🔍 Search stocks..."
        onChange={(e) => onSearch(e.target.value.toUpperCase())}
        style={{
          padding: "6px 12px",
          fontSize: "14px",
          borderRadius: "4px",
          border: "1px solid #30363d",
          backgroundColor: "#161b22",
          color: "#c9d1d9",
          outline: "none",
          width: "220px",
        }}
      />
    </div>
  );
};

export default Navbar;
