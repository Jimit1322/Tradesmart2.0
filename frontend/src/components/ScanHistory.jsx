import React, { useEffect, useState } from "react";

const ScanHistory = ({ searchQuery }) => {
  const [history5m, setHistory5m] = useState({});
  const [history1m, setHistory1m] = useState({});
  const [activeTab, setActiveTab] = useState("5m");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [res5m, res1m,resSummary] = await Promise.all([
          fetch("http://localhost:4000/api/history/5m"),
          fetch("http://localhost:4000/api/history/1m"),
          fetch("http://localhost:4000/api/summary")
        ]);
        const data5m = await res5m.json();
        const data1m = await res1m.json();
        setHistory5m(data5m);
        setHistory1m(data1m);
        setSummary(await resSummary.json());
      } catch (err) {
        console.error("❌ Fetch history failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const renderTable = (history, emaKey) => {
    const filtered = Object.fromEntries(
      Object.entries(history)
        .map(([date, data]) => {
          const stocksArray = data.stocks || []; // safely handle missing
          const filteredStocks = stocksArray.filter((s) =>
            s.symbol.includes(searchQuery.toUpperCase())
          );
          return [
            date,
            {
              ...data, // includes win/loss/etc
              stocks: filteredStocks,
            },
          ];
        })
        .filter(([_, data]) => data.stocks.length > 0)
    );
  
    return (
      <>
        {Object.entries(filtered).map(([date, { stocks, win, loss, no_hit, pending }]) => (
          <div key={date} style={{ marginBottom: 30 }}>
            <h3 style={{ color: "#fff" }}>
              {date} 📅 - ✅ {win} | ❌{loss} | ⚪ {no_hit} | ⏳ {pending}
            </h3>
          

            <table style={{ width: "100%", borderCollapse: "collapse", background: "#1e222d", color: "#eee" }}>
              <thead>
                <tr style={{ backgroundColor: "#2c2f35" }}>
                  <th style={thStyle}>Symbol</th>
                  <th style={thStyle}>Close</th>
                  <th style={thStyle}>{emaKey}</th>
                  <th style={thStyle}>Volume</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => (
                  <tr key={s.symbol + s.timestamp}>
                    <td style={tdStyle}>{s.symbol}</td>
                    <td style={tdStyle}>{s.close}</td>
                    <td style={tdStyle}>{s[emaKey.toLowerCase()] || "-"}</td>
                    <td style={tdStyle}>{s.volume}</td>
                    <td style={{ ...tdStyle, color: getStatusColor(s.status) }}>{s.status || "pending"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </>
    );
  };
  

  if (loading) return <p style={{ textAlign: "center", color: "#aaa" }}>Loading history...</p>;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <button onClick={() => setActiveTab("5m")} className={activeTab === "5m" ? "tab-active" : "tab"}>5-Min</button>
        <button onClick={() => setActiveTab("1m")} className={activeTab === "1m" ? "tab-active" : "tab"}>1-Min</button>
      </div>
  
      {/* --- 🧾 Weekly Summary Block --- */}
      {summary && (
        <div style={{ marginBottom: 30, color: "#eee", textAlign: "center" }}>
          <h3>📊 Weekly Summary</h3>
          <div style={{ display: "flex", justifyContent: "center", gap: 40 }}>
            <div>
              <h4 style={{ color: "#26a69a" }}>5-Min</h4>
              <p>✅ Wins: {summary.summary_5m.wins}</p>
              <p>❌ Losses: {summary.summary_5m.losses}</p>
              <p>🟡 No Hits: {summary.summary_5m.noHits}</p>
              <p>📈 Win Rate: {summary.summary_5m.winRate}%</p>
            </div>
            <div>
              <h4 style={{ color: "#26a69a" }}>1-Min</h4>
              <p>✅ Wins: {summary.summary_1m.wins}</p>
              <p>❌ Losses: {summary.summary_1m.losses}</p>
              <p>🟡 No Hits: {summary.summary_1m.noHits}</p>
              <p>📈 Win Rate: {summary.summary_1m.winRate}%</p>
            </div>
          </div>
        </div>
      )}
  
      {/* --- Tables --- */}
      {activeTab === "5m" && renderTable(history5m, "EMA22")}
      {activeTab === "1m" && renderTable(history1m, "EMA9")}
    </div>
  );
  
  
};

// Optional: color status text
const getStatusColor = (status) => {
  if (status === "win") return "#4caf50";
  if (status === "loss") return "#ef5350";
  if (status === "no_hit") return "#ffb74d";
  return "#aaa";
};

const thStyle = {
  padding: "10px",
  borderBottom: "1px solid #333",
  fontWeight: "bold"
};

const tdStyle = {
  padding: "8px",
  textAlign: "center",
  borderBottom: "1px solid #2c313d"
};

export default ScanHistory;
