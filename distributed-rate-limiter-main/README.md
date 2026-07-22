# Distributed Rate-Limiting API Service

A production-style rate limiter with multiple algorithms, atomic Redis operations,
fail-open degraded mode, and a live monitoring dashboard.

## Architecture

```
                 ┌─────────────┐
   Client App -->│  Express API │--> Redis (Lua scripts: atomic rate-limit ops)
                 │  (auth, gate)│--> Postgres (clients, policies, usage_log)
                 └─────┬───────┘
                       │ (fallback on Redis failure)
                       ▼
              In-memory circuit-breaker
              fallback limiter (degraded mode)

                 ┌─────────────┐
   React Dashboard │ <-- polls --> │ Express API
   (usage, clients, policies, health)
```

## Algorithms implemented (in Redis Lua, atomic)

| Algorithm | File | Trade-off |
|---|---|---|
| Token Bucket | `lua/token_bucket.lua` | Allows bursts up to capacity, smooth refill. Best general-purpose choice. |
| Sliding Window Log | `lua/sliding_window_log.lua` | Exact accuracy (sorted set of timestamps), but more memory per client. |
| Sliding Window Counter | `lua/sliding_window_counter.lua` | Approximate (weighted prev+current window), very memory efficient, slight edge-case inaccuracy. |

Each policy (tier) picks which algorithm to use — configurable live from the dashboard's Policies tab.

## Failure handling

- All Redis operations go through a simple **circuit breaker** (`backend/src/db/redis.js`).
- After 5 consecutive failures, the circuit opens and the service falls back to a **local
  in-memory fixed-window limiter** (fail-open style, degraded mode) instead of crashing or
  blocking all traffic.
- The dashboard's "System Health" tab shows Redis status and circuit breaker state in real time.
- After 10 seconds, the circuit goes half-open and retries Redis automatically.

## Setup (Ubuntu)

### 1. Install prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Allow running docker without sudo (logout/login after this)
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

### 2. Get the project onto your machine

If you received this as a folder, just `cd` into it. Otherwise initialize git:

```bash
cd ~/rate-limiter-project
git init
git add .
git commit -m "Initial commit: distributed rate limiter"
```

### 3. Run everything with Docker Compose (recommended)

```bash
cd ~/rate-limiter-project
docker compose up --build
```

This starts: Postgres (with schema auto-loaded), Redis, Backend (port 4000), Dashboard (port 5173).

Open the dashboard: **http://localhost:5173**
Backend health check: **http://localhost:4000/api/health**

### 4. Running locally WITHOUT Docker (manual, for development)

```bash
# Install Node.js 20 (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Install Redis locally
sudo apt install -y redis-server
sudo systemctl enable --now redis-server

# Install Postgres locally
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres createdb ratelimiter
sudo -u postgres psql -d ratelimiter -f backend/src/db/schema.sql

# Backend
cd backend
cp .env.example .env
npm install
npm run dev   # or: npm start

# Dashboard (in a new terminal)
cd dashboard
npm install
npm run dev
```

### 5. Test it manually

```bash
curl -X POST http://localhost:4000/api/check \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-key-123" \
  -d '{"route":"default"}'
```

Run it 100+ times in a loop and watch it start returning `429` once the free tier's
token bucket (default: capacity 20, refill ~1.67 tokens/sec) is exhausted:

```bash
for i in $(seq 1 50); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4000/api/check \
    -H "Content-Type: application/json" -H "X-API-Key: demo-key-123" -d '{}'
done
```

### 6. Load testing with k6

```bash
# Install k6
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt update
sudo apt install -y k6

# Run the load test (after backend is running)
k6 run loadtest/k6_script.js
```

This simulates 200 requests/sec for 30 seconds and checks that p99 latency stays under 50ms.
Record the output (allowed vs. 429 ratio, latency percentiles) and put it in your README/portfolio
as proof of scale.

### 7. Chaos test (simulate Redis failure)

```bash
docker stop ratelimiter-redis
# watch the dashboard's System Health tab flip to "Degraded" / circuit breaker "open"
# requests still get served via in-memory fallback instead of failing entirely
docker start ratelimiter-redis
# circuit breaker auto-recovers within ~10s
```

## What I'd change to scale this 100x

- Move from a single Redis instance to **Redis Cluster** with consistent hashing across
  shards, so no single node is a bottleneck and rate-limit keys are distributed.
- Replace synchronous `usage_log` inserts with an **async event pipeline** (Kafka or Redis
  Streams) so the hot path never waits on Postgres writes.
- Add **per-region Redis nodes** with a lightweight global counter synced periodically, so
  multi-region deployments don't add cross-region latency to every request.
- Add Prometheus + Grafana for request rate, latency percentiles, and block-rate dashboards
  instead of polling the API from the dashboard.

## Folder structure

```
rate-limiter-project/
├── backend/
│   ├── src/
│   │   ├── lua/              # atomic Redis rate-limit algorithms
│   │   ├── db/                # redis.js, postgres.js, schema.sql
│   │   ├── middleware/auth.js
│   │   ├── routes/            # check.js, admin.js, health.js
│   │   ├── utils/limiter.js   # algorithm dispatcher + fallback
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
├── dashboard/
│   ├── src/
│   │   ├── pages/              # Usage, Clients, Policies, Health
│   │   ├── components/Card.jsx
│   │   ├── api.js
│   │   └── App.jsx
│   ├── package.json
│   └── Dockerfile
├── loadtest/
│   └── k6_script.js
├── docker-compose.yml
└── README.md
```
