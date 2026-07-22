-- Token Bucket Algorithm (atomic via Lua)
-- KEYS[1] = bucket key (e.g. "ratelimit:tb:<client>:<route>")
-- ARGV[1] = capacity (max tokens)
-- ARGV[2] = refill_rate (tokens per second)
-- ARGV[3] = now (unix timestamp in ms)
-- ARGV[4] = requested tokens (usually 1)

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call("HMGET", key, "tokens", "timestamp")
local tokens = tonumber(bucket[1])
local timestamp = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  timestamp = now
end

-- refill based on elapsed time
local elapsed = math.max(0, now - timestamp)
local refill = (elapsed / 1000) * refill_rate
tokens = math.min(capacity, tokens + refill)

local allowed = 0
if tokens >= requested then
  tokens = tokens - requested
  allowed = 1
end

redis.call("HMSET", key, "tokens", tokens, "timestamp", now)
redis.call("EXPIRE", key, math.ceil(capacity / refill_rate) + 10)

return {allowed, math.floor(tokens), capacity}
