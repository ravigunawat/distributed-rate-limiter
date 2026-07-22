import React, { useEffect, useState } from "react";
import { getHealth } from "../api";
import Card from "../components/Card";

export default function HealthPanel() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const load = () => getHealth().then(setHealth).catch(() => setHealth({ redis: "unreachable" }));
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!health) return <Card>Loading...</Card>;

  const badge = (ok) => (
    <span
      style={{
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 12,
        background: ok ? "#064e3b" : "#7f1d1d",
        color: ok ? "#34d399" : "#f87171",
      }}
    >
      {ok ? "Healthy" : "Degraded"}
    </span>
  );

  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
      <Card title="Redis Status">
        {badge(health.redis === "up")} <span style={{ marginLeft: 8 }}>{health.redis}</span>
      </Card>
      <Card title="Circuit Breaker">
        {badge(health.circuitBreaker === "closed")}{" "}
        <span style={{ marginLeft: 8 }}>{health.circuitBreaker}</span>
        {(health.circuitBreaker === "open" || health.circuitBreaker === "half-open") && (
          <p style={{ fontSize: 12, color: "#f87171", marginTop: 8 }}>
            Redis unreachable — system running on local in-memory fallback (degraded mode).
          </p>
        )}
      </Card>
    </div>
  );
}
