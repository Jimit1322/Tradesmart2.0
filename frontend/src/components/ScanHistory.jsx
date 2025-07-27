import React, { useEffect, useState } from "react";
import StockChart from "../StockChart.jsx";

const ScanHistory = ({ searchQuery }) => {
  const [history5m, setHistory5m] = useState({});
  const [history1m, setHistory1m] = useState({});
  const [summary, setSummary] = useState(null);
  const [allSummaries, setAllSummaries] = useState({ summary_5m: [], summary_1m: [] });
  const [activeTab, setActiveTab] = useState("5m");
  const [expandedRow, setExpandedRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [res5m, res1m, resSummary, resAllSummaries] = await Promise.all([
          fetch("http://localhost:4000/api/history/5m"),
          fetch("http://localhost:4000/api/history/1m"),
          fetch("http://localhost:4000/api/summary"),
          fetch("http://localhost:4000/api/summary/all")
        ]);

        setHistory5m(await res5m.json());
        setHistory1m(await res1m.json());
        setSummary(await resSummary.json());

        const all = await resAllSummaries.json();

        const summary_5m = all.map(w => ({
          week_start: w.week,
          week_end: w.week,
          wins: w.summary_5m?.wins ?? 0,
          losses: w.summary_5m?.losses ?? 0,
          winRate: w.summary_5m?.winRate ?? 0,     // ✅ correct field
          noHits: w.summary_5m?.noHits ?? 0
        }));
        
        const summary_1m = all.map(w => ({
          week_start: w.week,
          week_end: w.week,
          wins: w.summary_1m?.wins ?? 0,
          losses: w.summary_1m?.losses ?? 0,
          winRate: w.summary_1m?.winRate ?? 0,     // ✅ correct field
          noHits: w.summary_1m?.noHits ?? 0
        }));

        setAllSummaries({ summary_5m, summary_1m });
      } catch (err) {
        console.error("❌ Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRowClick = (symbol, tf) => {
    const key = `${symbol}_${tf}`;
    setExpandedRow(prev => (prev === key ? null : key));
  };

  const renderTable = (history, emaKey) => {
    const tf = activeTab;
    const filtered = Object.entries(history)
      .map(([date, data]) => {
        const filteredStocks = (data.stocks || []).filter((s) =>
          s.symbol.includes(searchQuery.toUpperCase())
        );
        return [date, { ...data, stocks: filteredStocks }];
      })
      .filter(([_, data]) => data.stocks.length > 0);

    return (
      <>
        {filtered.map(([date, { stocks, win, loss, no_hit, pending }]) => (
          <div key={date} style={historyBlockStyle}>
            <h3 style={dateHeaderStyle}>
              {date} 📅 —
              <span style={statusText("#4caf50")}> ✅ {win}</span>{" "}
              <span style={statusText("#ef5350")}>❌ {loss}</span>{" "}
              <span style={statusText("#ffb74d")}>⚪ {no_hit}</span>{" "}
              <span style={statusText("#00bcd4")}>⏳ {pending}</span>
            </h3>
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRowStyle}>
                    <th style={thStyle}>Symbol</th>
                    <th style={thStyle}>Close</th>
                    <th style={thStyle}>{emaKey}</th>
                    <th style={thStyle}>Volume</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s) => {
                    const key = `${s.symbol}_${tf}`;
                    const isExpanded = expandedRow === key;
                    return (
                      <React.Fragment key={s.symbol + s.timestamp}>
                        <tr onClick={() => handleRowClick(s.symbol, tf)} style={rowHoverStyle}>
                          <td style={tdStyle}>{s.symbol}</td>
                          <td style={tdStyle}>{s.close}</td>
                          <td style={tdStyle}>{s[emaKey.toLowerCase()] || "-"}</td>
                          <td style={tdStyle}>{s.volume?.toLocaleString()}</td>
                          <td style={tdStyle}>
                            <span style={badgeStyle(s.status)}>{s.status || "pending"}</span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan="5" style={{ padding: 20, background: "#0e1116" }}>
                              <StockChart symbol={s.symbol} tf={tf} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </>
    );
  };

  const renderWeeklySummary = () => {
    const prev5m = [...(allSummaries.summary_5m || [])].sort((a, b) => b.week_start.localeCompare(a.week_start));
    const prev1m = [...(allSummaries.summary_1m || [])].sort((a, b) => b.week_start.localeCompare(a.week_start));
    
    

    return (
      <div style={summaryCardWrapper}>
        <h3 style={summaryHeaderStyle}>📊 Current Week Summary</h3>
        <div style={summaryCardRow}>
          <SummaryCard title="5-Min" data={summary?.summary_5m || {}} />
          <SummaryCard title="1-Min" data={summary?.summary_1m || {}} />
        </div>

        <h3 style={{ marginTop: 30, color: "#90caf9" }}>📅 Previous Week Summaries</h3>
        <div style={summaryCardRow}>
          {prev5m.map((week, i) => (
            <SummaryCard
              key={`prev5m-${i}`}
              title={`5m: ${week.week_start}`}
              data={week}
            />
          ))}
          {prev1m.map((week, i) => (
            <SummaryCard
              key={`prev1m-${i}`}
              title={`1m: ${week.week_start} `}
              data={week}
            />
          ))}
        </div>
      </div>
    );
  };

  if (loading) return <p style={{ textAlign: "center", color: "#ccc" }}>Loading history...</p>;

  return (
    <div style={containerStyle}>
      {/* Tabs */}
      <div style={tabsWrapper}>
        <button onClick={() => setActiveTab("5m")} style={tabStyle(activeTab === "5m")}>🕔 5-Min</button>
        <button onClick={() => setActiveTab("1m")} style={tabStyle(activeTab === "1m")}>⏱ 1-Min</button>
      </div>

      {/* Summary Cards */}
      {summary && allSummaries && renderWeeklySummary()}

      {/* Tables */}
      {activeTab === "5m" && renderTable(history5m, "EMA22")}
      {activeTab === "1m" && renderTable(history1m, "EMA9")}
    </div>
  );
};

// --- Reusable Components & Styles ---

const SummaryCard = ({ title, data }) => (
  <div style={summaryCard}>
    <h4 style={{ color: "#26a69a", marginBottom: 8 }}>{title}</h4>
    <p>✅ Wins: {data.wins}</p>
    <p>❌ Losses: {data.losses}</p>
    <p>📈 Win Rate: {data.winRate}%</p>
  </div>
);

const badgeStyle = (status) => ({
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: "14px",
  fontSize: "12px",
  fontWeight: "bold",
  backgroundColor:
    status === "win" ? "#2e7d32" :
    status === "loss" ? "#c62828" :
    status === "no_hit" ? "#ff9800" :
    "#546e7a",
  color: "#fff",
  textTransform: "uppercase",
});

const containerStyle = { padding: "20px", fontFamily: "Inter, sans-serif" };
const tabsWrapper = { display: "flex", justifyContent: "center", marginBottom: 20, gap: 12 };
const tabStyle = (active) => ({
  padding: "8px 16px",
  borderRadius: "6px",
  backgroundColor: active ? "#1e88e5" : "#37474f",
  color: "#fff",
  fontWeight: "bold",
  border: "none",
  cursor: "pointer",
  fontSize: "14px",
});

const summaryCardWrapper = { marginBottom: 30, textAlign: "center", color: "#eee" };
const summaryHeaderStyle = { marginBottom: 12, color: "#90caf9" };
const summaryCardRow = { display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" };
const summaryCard = {
  background: "#1e222d",
  padding: "15px 20px",
  borderRadius: "10px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  minWidth: 160,
};

const historyBlockStyle = {
  marginBottom: 40,
  background: "#121212",
  borderRadius: "10px",
  padding: "12px 18px",
};

const dateHeaderStyle = {
  color: "#90caf9",
  fontSize: "16px",
  fontWeight: "600",
  marginBottom: 10,
};

const tableWrapperStyle = { overflowX: "auto" };
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#1e222d",
  color: "#eee",
};

const theadRowStyle = { backgroundColor: "#2c2f35" };
const thStyle = {
  padding: "10px",
  borderBottom: "1px solid #444",
  fontWeight: "bold",
  textAlign: "center",
};

const tdStyle = {
  padding: "8px",
  textAlign: "center",
  borderBottom: "1px solid #333",
  fontSize: "14px",
};

const rowHoverStyle = { transition: "background 0.2s", cursor: "pointer" };
const statusText = (color) => ({ color, fontWeight: "600", fontSize: "13px" });

export default ScanHistory;
