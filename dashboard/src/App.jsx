import React, { useState } from "react";
import UsagePanel from "./pages/UsagePanel";
import ClientsPanel from "./pages/ClientsPanel";
import PoliciesPanel from "./pages/PoliciesPanel";
import HealthPanel from "./pages/HealthPanel";

const TABS = ["Usage", "Clients", "Policies", "System Health"];

export default function App() {
  const [tab, setTab] = useState("Usage");

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Distributed Rate Limiter — Dashboard</h1>
      <p style={{ color: "#9ca3af", marginTop: 0 }}>
        Live usage, client management, and policy simulation
      </p>

      <div style={{ display: "flex", gap: 8, margin: "20px 0", borderBottom: "1px solid #1f2937" }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              borderBottom: tab === t ? "2px solid #6366f1" : "2px solid transparent",
              color: tab === t ? "#fff" : "#9ca3af",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Usage" && <UsagePanel />}
      {tab === "Clients" && <ClientsPanel />}
      {tab === "Policies" && <PoliciesPanel />}
      {tab === "System Health" && <HealthPanel />}
    </div>
  );
}
