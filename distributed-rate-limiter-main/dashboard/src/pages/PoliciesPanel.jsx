import React, { useEffect, useState } from "react";
import { getPolicies, updatePolicy } from "../api";
import Card from "../components/Card";

export default function PoliciesPanel() {
  const [policies, setPolicies] = useState([]);

  const load = () => getPolicies().then(setPolicies).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const handleChange = (tier, field, value) => {
    setPolicies((prev) =>
      prev.map((p) => (p.tier === tier ? { ...p, [field]: value } : p))
    );
  };

  const handleSave = async (p) => {
    await updatePolicy(p.tier, {
      algorithm: p.algorithm,
      limit_per_window: Number(p.limit_per_window),
      window_seconds: Number(p.window_seconds),
      burst_capacity: p.burst_capacity ? Number(p.burst_capacity) : null,
      refill_rate: p.refill_rate ? Number(p.refill_rate) : null,
    });
    load();
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {policies.map((p) => (
        <Card key={p.tier} title={`Policy: ${p.tier}`}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, alignItems: "end" }}>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>
              Algorithm
              <select
                value={p.algorithm}
                onChange={(e) => handleChange(p.tier, "algorithm", e.target.value)}
                style={{ width: "100%", padding: 6, background: "#0f1115", border: "1px solid #374151", borderRadius: 6, color: "#fff" }}
              >
                <option value="token_bucket">token_bucket</option>
                <option value="sliding_window_counter">sliding_window_counter</option>
                <option value="sliding_window_log">sliding_window_log</option>
              </select>
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>
              Limit/window
              <input
                type="number"
                value={p.limit_per_window}
                onChange={(e) => handleChange(p.tier, "limit_per_window", e.target.value)}
                style={{ width: "100%", padding: 6, background: "#0f1115", border: "1px solid #374151", borderRadius: 6, color: "#fff" }}
              />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>
              Window (sec)
              <input
                type="number"
                value={p.window_seconds}
                onChange={(e) => handleChange(p.tier, "window_seconds", e.target.value)}
                style={{ width: "100%", padding: 6, background: "#0f1115", border: "1px solid #374151", borderRadius: 6, color: "#fff" }}
              />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>
              Burst capacity
              <input
                type="number"
                value={p.burst_capacity || ""}
                onChange={(e) => handleChange(p.tier, "burst_capacity", e.target.value)}
                style={{ width: "100%", padding: 6, background: "#0f1115", border: "1px solid #374151", borderRadius: 6, color: "#fff" }}
              />
            </label>
            <button
              onClick={() => handleSave(p)}
              style={{ padding: "8px 14px", background: "#6366f1", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer" }}
            >
              Save
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
