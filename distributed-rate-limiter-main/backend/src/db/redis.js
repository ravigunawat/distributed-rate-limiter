const Redis = require("ioredis");
const fs = require("fs");
const path = require("path");

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) return null; // stop retrying, let circuit breaker handle it
    return Math.min(times * 100, 1000);
  },
});

// --- Simple Circuit Breaker ---
let failureCount = 0;
let circuitOpen = false;
let halfOpen = false; // true = allowing one trial request through, not yet confirmed closed
let lastFailureTime = 0;
const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT_MS = 10000;

function recordFailure() {
  failureCount++;
  lastFailureTime = Date.now();
  halfOpen = false;
  if (failureCount >= FAILURE_THRESHOLD) {
    circuitOpen = true;
    console.error("[CircuitBreaker] OPEN - Redis failures exceeded threshold");
  }
}

function recordSuccess() {
  failureCount = 0;
  if (circuitOpen || halfOpen) {
    console.log("[CircuitBreaker] CLOSED - Redis recovered");
  }
  circuitOpen = false;
  halfOpen = false;
}

// Used by request-handling code: decides whether to attempt Redis at all.
function isCircuitOpen() {
  if (circuitOpen && Date.now() - lastFailureTime > RESET_TIMEOUT_MS) {
    console.log("[CircuitBreaker] HALF-OPEN - trying Redis again");
    halfOpen = true; // allow ONE trial through; stays "open" for reporting until success
    return false; // let the next request attempt Redis
  }
  return circuitOpen;
}

// Used by /api/health: accurate current state for display, doesn't mutate state.
function getCircuitState() {
  if (circuitOpen) return halfOpen ? "half-open" : "open";
  return "closed";
}

redis.on("error", (err) => {
  console.error("[Redis] connection error:", err.message);
});

redis.on("connect", () => {
  console.log("[Redis] connected to", REDIS_HOST + ":" + REDIS_PORT);
});

// Load Lua scripts as commands
const scripts = {
  tokenBucket: fs.readFileSync(path.join(__dirname, "../lua/token_bucket.lua"), "utf8"),
  slidingWindowCounter: fs.readFileSync(
    path.join(__dirname, "../lua/sliding_window_counter.lua"),
    "utf8"
  ),
  slidingWindowLog: fs.readFileSync(
    path.join(__dirname, "../lua/sliding_window_log.lua"),
    "utf8"
  ),
};

redis.defineCommand("tokenBucket", { numberOfKeys: 1, lua: scripts.tokenBucket });
redis.defineCommand("slidingWindowCounter", {
  numberOfKeys: 2,
  lua: scripts.slidingWindowCounter,
});
redis.defineCommand("slidingWindowLog", { numberOfKeys: 1, lua: scripts.slidingWindowLog });

module.exports = { redis, recordFailure, recordSuccess, isCircuitOpen, getCircuitState };
