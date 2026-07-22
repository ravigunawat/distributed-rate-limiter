const { redis, recordFailure, recordSuccess, isCircuitOpen } = require("../db/redis");

// In-memory fallback store (used when Redis circuit is open -> fail gracefully)
const localBuckets = new Map();

function localFallbackCheck(clientKey, limit) {
  // simple fixed-window in-memory fallback (fail-open-ish, degraded mode)
  const now = Date.now();
  const windowMs = 60000;
  const entry = localBuckets.get(clientKey) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count++;
  localBuckets.set(clientKey, entry);

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    limit,
    degraded: true,
  };
}

async function checkRateLimit({ clientId, route, algorithm, policy, region = "default" }) {
  const now = Date.now();
  const baseKey = `ratelimit:${algorithm}:${clientId}:${route}:${region}`;

  if (isCircuitOpen()) {
    return localFallbackCheck(baseKey, policy.limit_per_window);
  }

  try {
    let result;

    if (algorithm === "token_bucket") {
      const capacity = policy.burst_capacity || policy.limit_per_window;
      const refillRate = policy.refill_rate || policy.limit_per_window / policy.window_seconds;
      const r = await redis.tokenBucket(baseKey, capacity, refillRate, now, 1);
      result = { allowed: !!r[0], remaining: r[1], limit: r[2] };
    } else if (algorithm === "sliding_window_counter") {
      const windowId = Math.floor(now / 1000 / policy.window_seconds);
      const currentKey = `${baseKey}:w${windowId}`;
      const prevKey = `${baseKey}:w${windowId - 1}`;
      const r = await redis.slidingWindowCounter(
        currentKey,
        prevKey,
        policy.limit_per_window,
        policy.window_seconds,
        now
      );
      result = { allowed: !!r[0], remaining: Math.max(0, r[2] - r[1]), limit: r[2] };
    } else if (algorithm === "sliding_window_log") {
      const r = await redis.slidingWindowLog(
        baseKey,
        policy.limit_per_window,
        policy.window_seconds,
        now
      );
      result = { allowed: !!r[0], remaining: Math.max(0, r[2] - r[1]), limit: r[2] };
    } else {
      throw new Error(`Unknown algorithm: ${algorithm}`);
    }

    recordSuccess();
    return { ...result, degraded: false };
  } catch (err) {
    console.error("[RateLimiter] Redis error, falling back:", err.message);
    recordFailure();
    return localFallbackCheck(baseKey, policy.limit_per_window);
  }
}

module.exports = { checkRateLimit };
