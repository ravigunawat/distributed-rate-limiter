-- Sliding Window Log Algorithm (exact, uses sorted set, more memory)
-- KEYS[1] = log key (sorted set of request timestamps)
-- ARGV[1] = limit
-- ARGV[2] = window_seconds
-- ARGV[3] = now (unix timestamp in ms)

local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2]) * 1000
local now = tonumber(ARGV[3])

local window_start = now - window_ms

-- remove old entries outside the window
redis.call("ZREMRANGEBYSCORE", key, 0, window_start)

local count = redis.call("ZCARD", key)

local allowed = 0
if count < limit then
  allowed = 1
  redis.call("ZADD", key, now, now .. "-" .. math.random(1000000))
  redis.call("EXPIRE", key, math.ceil(window_ms / 1000) + 5)
end

return {allowed, count, limit}
