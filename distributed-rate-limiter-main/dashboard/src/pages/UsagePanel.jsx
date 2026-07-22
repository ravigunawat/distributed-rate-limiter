import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { getUsage, checkRateLimit } from "../api";
import Card from "../components/Card";

export default function UsagePanel() {
  const [apiKey, setApiKey] = useState("demo-key-123");
  const [data, setData] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchUsage = async () => {
    try {
      const d = await getUsage(apiKey);
      setData(d);
      setError(null);
    } catch (e) {
      setError("Client not found or backend unreachable");
    }
  };

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 3000); // live polling every 3s
    return () => clearInterval(interval);
  }, [apiKey]);

  const handleTestRequest = async () => {
    const result = await checkRateLimit(apiKey);
    setLastResult(result);
    fetchUsage();
  };

  const chartData = data?.recent
    ?.slice()
    .reverse()
    .map((r, idx) => ({
      idx,
      remaining: r.remaining,
      allowed: r.allowed ? 1 : 0,
    }));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card title="API Key">
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{
            padding: 8,
            width: "100%",
            background: "#0f1115",
            border: "1px solid #374151",
            borderRadius: 6,
            color: "#fff",
          }}
        />
        <button
          onClick={handleTestRequest}
          style={{
            marginTop: 10,
            padding: "8px 14px",
            background: "#6366f1",
            border: "none",
            borderRadius: 6,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Send Test Request
        </button>
        {lastResult && (
          <pre style={{ marginTop: 10, fontSize: 12, color: lastResult.allowed ? "#34d399" : "#f87171" }}>
            {JSON.stringify(lastResult, null, 2)}
          </pre>
        )}
      </Card>

      {error && <Card><span style={{ color: "#f87171" }}>{error}</span></Card>}

      {data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card title="Client">
              <p>Name: {data.client.name}</p>
              <p>Tier: {data.client.tier}</p>
            </Card>
            <Card title="Last 1 hour">
              <p>Allowed: {data.summary.allowed_count}</p>
              <p>Blocked: {data.summary.blocked_count}</p>
            </Card>
          </div>

          <Card title="Remaining Quota Over Time (most recent requests)">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="idx" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ background: "#161922", border: "1px solid #374151" }} />
                <Line type="monotone" dataKey="remaining" stroke="#6366f1" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}
