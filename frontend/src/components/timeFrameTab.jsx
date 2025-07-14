// components/TimeframeTabs.jsx
import React, { useState } from "react";
import ScanHistory from "./ScanHistory.jsx"; // ⬅️ Import the component

const TimeframeTabs = ({ data1m, data5m, dataDaily, renderTable, searchQuery }) => {
  const [activeTab, setActiveTab] = useState("5m");

  const filterData = (data) => data.filter((s) => s.symbol.includes(searchQuery.toUpperCase()));

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <button onClick={() => setActiveTab("1m")} className={activeTab === "1m" ? "tab-active" : "tab"}>
          1-Min EMA9
        </button>
        <button onClick={() => setActiveTab("5m")} className={activeTab === "5m" ? "tab-active" : "tab"}>
          5-Min EMA22
        </button>
        <button onClick={() => setActiveTab("daily")} className={activeTab === "daily" ? "tab-active" : "tab"}>
          Daily EMA44
        </button>
        <button onClick={() => setActiveTab("history")} className={activeTab === "history" ? "tab-active" : "tab"}>
          📊 History
        </button>
      </div>

      <div>
        {activeTab === "1m" && renderTable(filterData(data1m), "1-min", "EMA9")}
        {activeTab === "5m" && renderTable(filterData(data5m), "5-min", "EMA22")}
        {activeTab === "daily" && renderTable(filterData(dataDaily), "Daily", "EMA44")}
        {activeTab === "history" && <ScanHistory searchQuery={searchQuery}/>} {/* 👈 Add ScanHistory here */}
      </div>
    </>
  );
};

export default TimeframeTabs;
