const express = require("express");
const router = express.Router();
const pool = require("../db/postgres");
const { checkRateLimit } = require("../utils/limiter");

// POST /api/check  -> the actual rate-limit gate clients call before doing real work
router.post("/check", async (req, res) => {
  const client = req.client;
  const route = req.body.route || "default";
  const region = req.body.region || "default";

  const policy = {
    algorithm: client.algorithm,
    limit_per_window: client.limit_per_window,
    window_seconds: client.window_seconds,
    burst_capacity: client.burst_capacity,
    refill_rate: client.refill_rate,
  };

  const result = await checkRateLimit({
    clientId: client.id,
    route,
    algorithm: policy.algorithm,
    policy,
    region,
  });

  // fire-and-forget usage log (don't block response on this)
  pool
    .query(
      `INSERT INTO usage_log (client_id, route, allowed, remaining, algorithm, region)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [client.id, route, result.allowed, result.remaining, policy.algorithm, region]
    )
    .catch((e) => console.error("[UsageLog] failed:", e.message));

  res.set("X-RateLimit-Limit", result.limit);
  res.set("X-RateLimit-Remaining", result.remaining);
  if (result.degraded) res.set("X-RateLimit-Mode", "degraded");

  if (!result.allowed) {
    res.set("Retry-After", policy.window_seconds || 60);
    return res.status(429).json({
      error: "Rate limit exceeded",
      limit: result.limit,
      remaining: result.remaining,
      degraded: result.degraded || false,
    });
  }

  res.status(200).json({
    allowed: true,
    limit: result.limit,
    remaining: result.remaining,
    degraded: result.degraded || false,
  });
});

module.exports = router;
