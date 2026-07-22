-- Sliding Window Counter Algorithm (approximate, memory-efficient)
-- KEYS[1] = current window key
-- KEYS[2] = previous window key
-- ARGV[1] = limit (max requests per window)
-- ARGV[2] = window_seconds
-- ARGV[3] = now (unix timestamp in ms)

local current_key = KEYS[1]
local prev_key = KEYS[2]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local current_count = tonumber(redis.call("GET", current_key) or "0")
local prev_count = tonumber(redis.call("GET", prev_key) or "0")

-- elapsed fraction inside the current window (0 to 1)
local elapsed_ms = now % (window * 1000)
local elapsed_fraction = elapsed_ms / (window * 1000)

-- weighted estimate combining previous window's tail + current window
local estimated = (prev_count * (1 - elapsed_fraction)) + current_count

local allowed = 0
if estimated < limit then
  allowed = 1
  redis.call("INCR", current_key)
  redis.call("EXPIRE", current_key, window * 2)
end

return {allowed, math.floor(estimated), limit}
