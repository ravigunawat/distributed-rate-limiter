const express = require("express");
const router = express.Router();
const { redis, getCircuitState } = require("../db/redis");

router.get("/health", async (req, res) => {
  let redisStatus = "up";
  try {
    await redis.ping();
  } catch (e) {
    redisStatus = "down";
  }

  res.json({
    status: "ok",
    redis: redisStatus,
    circuitBreaker: getCircuitState(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
