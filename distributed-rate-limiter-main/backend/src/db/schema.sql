-- Database schema for Distributed Rate Limiter

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  tier VARCHAR(50) NOT NULL DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS policies (
  id SERIAL PRIMARY KEY,
  tier VARCHAR(50) UNIQUE NOT NULL,
  algorithm VARCHAR(50) NOT NULL DEFAULT 'token_bucket', -- token_bucket | sliding_window_log | sliding_window_counter
  limit_per_window INT NOT NULL,
  window_seconds INT NOT NULL,
  burst_capacity INT, -- used by token bucket
  refill_rate FLOAT,  -- used by token bucket (tokens/sec)
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_log (
  id BIGSERIAL PRIMARY KEY,
  client_id INT REFERENCES clients(id) ON DELETE CASCADE,
  route VARCHAR(255),
  allowed BOOLEAN,
  remaining INT,
  algorithm VARCHAR(50),
  region VARCHAR(50) DEFAULT 'default',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_log_client_time ON usage_log (client_id, created_at);

-- seed default policies
INSERT INTO policies (tier, algorithm, limit_per_window, window_seconds, burst_capacity, refill_rate)
VALUES
  ('free', 'token_bucket', 100, 60, 20, 1.67),
  ('pro', 'sliding_window_counter', 1000, 60, NULL, NULL),
  ('enterprise', 'sliding_window_log', 10000, 60, NULL, NULL)
ON CONFLICT (tier) DO NOTHING;

-- seed a demo client (api_key: demo-key-123)
INSERT INTO clients (name, api_key, tier)
VALUES ('Demo Client', 'demo-key-123', 'free')
ON CONFLICT (api_key) DO NOTHING;
