const pool = require("../db/postgres");

async function authMiddleware(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    return res.status(401).json({ error: "Missing X-API-Key header" });
  }

  try {
    const result = await pool.query(
      `SELECT c.*, p.algorithm, p.limit_per_window, p.window_seconds, p.burst_capacity, p.refill_rate
       FROM clients c
       JOIN policies p ON p.tier = c.tier
       WHERE c.api_key = $1`,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    req.client = result.rows[0];
    next();
  } catch (err) {
    console.error("[Auth] DB error:", err.message);
    res.status(500).json({ error: "Internal auth error" });
  }
}

module.exports = authMiddleware;
