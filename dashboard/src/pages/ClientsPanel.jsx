import React, { useEffect, useState } from "react";
import { getClients, createClient, updateClientTier } from "../api";
import Card from "../components/Card";

export default function ClientsPanel() {
  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");
  const [tier, setTier] = useState("free");

  const load = () => getClients().then(setClients).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!name) return;
    await createClient({ name, tier });
    setName("");
    load();
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card title="Create New Client">
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Client name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 1, padding: 8, background: "#0f1115", border: "1px solid #374151", borderRadius: 6, color: "#fff" }}
          />
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            style={{ padding: 8, background: "#0f1115", border: "1px solid #374151", borderRadius: 6, color: "#fff" }}
          >
            <option value="free">free</option>
            <option value="pro">pro</option>
            <option value="enterprise">enterprise</option>
          </select>
          <button
            onClick={handleCreate}
            style={{ padding: "8px 14px", background: "#6366f1", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer" }}
          >
            Create
          </button>
        </div>
      </Card>

      <Card title="All Clients">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#9ca3af" }}>
              <th style={{ padding: 6 }}>Name</th>
              <th style={{ padding: 6 }}>API Key</th>
              <th style={{ padding: 6 }}>Tier</th>
              <th style={{ padding: 6 }}>Change Tier</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid #1f2937" }}>
                <td style={{ padding: 6 }}>{c.name}</td>
                <td style={{ padding: 6, fontFamily: "monospace" }}>{c.api_key}</td>
                <td style={{ padding: 6 }}>{c.tier}</td>
                <td style={{ padding: 6 }}>
                  <select
                    value={c.tier}
                    onChange={(e) => updateClientTier(c.id, e.target.value).then(load)}
                    style={{ background: "#0f1115", border: "1px solid #374151", borderRadius: 6, color: "#fff" }}
                  >
                    <option value="free">free</option>
                    <option value="pro">pro</option>
                    <option value="enterprise">enterprise</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
