const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const pool = require("../db/postgres");

// GET /api/clients -> list all clients (admin view)
router.get("/clients", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, api_key, tier, created_at FROM clients ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("[GET /clients]", err.message);
    res.status(500).json({ error: "Database unreachable" });
  }
});

// POST /api/clients -> create a new client + api key
router.post("/clients", async (req, res) => {
  const { name, tier } = req.body;
  if (!name || !tier) return res.status(400).json({ error: "name and tier required" });

  const apiKey = crypto.randomBytes(24).toString("hex");
  try {
    const result = await pool.query(
      `INSERT INTO clients (name, api_key, tier) VALUES ($1, $2, $3) RETURNING *`,
      [name, apiKey, tier]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[POST /clients]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clients/:id/tier -> change a client's tier
router.put("/clients/:id/tier", async (req, res) => {
  try {
    const { tier } = req.body;
    const result = await pool.query(
      `UPDATE clients SET tier = $1 WHERE id = $2 RETURNING *`,
      [tier, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Client not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[PUT /clients/:id/tier]", err.message);
    res.status(500).json({ error: "Database unreachable" });
  }
});

// GET /api/policies -> list all policies
router.get("/policies", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM policies ORDER BY tier`);
    res.json(result.rows);
  } catch (err) {
    console.error("[GET /policies]", err.message);
    res.status(500).json({ error: "Database unreachable" });
  }
});

// PUT /api/policies/:tier -> update a policy (admin simulator uses this)
router.put("/policies/:tier", async (req, res) => {
  try {
    const { algorithm, limit_per_window, window_seconds, burst_capacity, refill_rate } = req.body;
    const result = await pool.query(
      `UPDATE policies SET algorithm=$1, limit_per_window=$2, window_seconds=$3,
       burst_capacity=$4, refill_rate=$5, updated_at=NOW()
       WHERE tier=$6 RETURNING *`,
      [algorithm, limit_per_window, window_seconds, burst_capacity, refill_rate, req.params.tier]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Policy not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[PUT /policies/:tier]", err.message);
    res.status(500).json({ error: "Database unreachable" });
  }
});

// GET /api/usage/:apiKey -> usage stats for dashboard (last 100 + summary)
router.get("/usage/:apiKey", async (req, res) => {
  try {
    const clientResult = await pool.query(`SELECT * FROM clients WHERE api_key = $1`, [
      req.params.apiKey,
    ]);
    if (clientResult.rows.length === 0)
      return res.status(404).json({ error: "Client not found" });
    const client = clientResult.rows[0];

    const logs = await pool.query(
      `SELECT * FROM usage_log WHERE client_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [client.id]
    );

    const summary = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE allowed) AS allowed_count,
         COUNT(*) FILTER (WHERE NOT allowed) AS blocked_count
       FROM usage_log
       WHERE client_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [client.id]
    );

    res.json({
      client,
      summary: summary.rows[0],
      recent: logs.rows,
    });
  } catch (err) {
    console.error("[GET /usage/:apiKey]", err.message);
    res.status(500).json({ error: "Database unreachable" });
  }
});

module.exports = router;
