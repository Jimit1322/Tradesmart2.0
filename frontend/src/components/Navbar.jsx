
import React from 'react'

const Navbar = () => {
    return (
      <div
        style={{
          background: "linear-gradient(to right, #e0f7fa, #b2ebf2)",
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
        }}
      >
        <h1
          style={{
            color: "#004d40",
            fontSize: "24px",
            fontWeight: "600",
            margin: 0,
            fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif"
          }}
        >
          TradeSmart
        </h1>
      </div>
    );
  };
  
  export default Navbar;
  
