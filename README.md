# API Gateway — Node.js, Express, Redis & Docker

A production-style API Gateway built with Node.js and Express. Authenticates API keys, rate-limits with Redis, routes to backend microservices, logs all requests, and handles backend failures gracefully.

---

## Architecture

```
Client Request
     │
     ▼
┌──────────────────────────────────────────────┐
│                 API Gateway :3000            │
│                                              │
│  1. logger       → log every request         │
│  2. auth         → validate x-api-key header │
│  3. rateLimiter  → Redis counter per key     │
│  4. proxyRouter  → forward to service        │
│  5. errorHandler → catch & format errors     │
└──────────────────────┬───────────────────────┘
                       │
          ┌────────────┴─────────────┐
          ▼                          ▼
  ┌──────────────┐          ┌──────────────────┐
  │ users-service│          │ products-service  │
  │   :3001      │          │   :3002           │
  └──────────────┘          └──────────────────┘

          Redis :6379  (rate limit counters)
```

### Request Flow

1. **Logger** — records timestamp, method, path. Waits for `res.finish` to capture status and duration.
2. **Auth** — reads `x-api-key` header. Returns `401` if missing, `403` if invalid.
3. **Rate Limiter** — uses Redis `INCR` + `EXPIRE` per API key. Returns `429` if over limit. Fail-open if Redis is down.
4. **Proxy Router** — matches URL prefix, strips it, forwards to backend using Node's built-in `http` module with `AbortController` timeout.
5. **Error Handler** — catches `502 Bad Gateway` (service down), `504 Gateway Timeout`, and any other errors. Returns consistent JSON.

---

## Project Structure

```
api-gateway/
├── gateway/
│   ├── src/
│   │   ├── config/index.js        # All env vars in one place
│   │   ├── middleware/
│   │   │   ├── auth.js            # API key validation
│   │   │   ├── rateLimiter.js     # Redis rate limiting
│   │   │   ├── logger.js          # Request/response logging
│   │   │   └── errorHandler.js    # Global error formatting
│   │   ├── routes/proxy.js        # Proxy to backend services
│   │   └── utils/redis.js         # Shared Redis client
│   ├── .env                       # Local dev config
│   ├── Dockerfile
│   ├── package.json
│   └── server.js                  # Entry point
│
├── services/
│   ├── users-service/
│   │   ├── src/app.js             # Users REST API
│   │   ├── Dockerfile
│   │   └── server.js
│   └── products-service/
│       ├── src/app.js             # Products REST API
│       ├── Dockerfile
│       └── server.js
│
├── docker-compose.yml
└── README.md
```

---

## Quick Start (Docker — Recommended)

> **Requires**: Docker Desktop running

```powershell
# 1. Navigate to the project folder
cd "api gateway new"

# 2. Build and start all services
docker compose up --build

# 3. Verify everything is running
docker compose ps
```

All services start on the `api-net` internal bridge network.
Only the gateway is exposed: **http://localhost:3000**

---

## Configuration

All config lives in `gateway/.env` (locally) or `docker-compose.yml` environment section (Docker).

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Gateway listen port |
| `API_KEYS` | — | Comma-separated valid API keys |
| `REDIS_HOST` | `redis` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `RATE_LIMIT_MAX` | `20` | Max requests per window per key |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Window duration in seconds |
| `PROXY_TIMEOUT_MS` | `5000` | Max wait for backend response |
| `USERS_SERVICE_URL` | — | Users service base URL |
| `PRODUCTS_SERVICE_URL` | — | Products service base URL |

---

## API Reference

All requests (except `/health`) require the header:
```
x-api-key: key-client-abc-123
```

### Gateway

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Gateway health check (no auth required) |

### Users Service

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users` | List all users |
| `GET` | `/api/users/:id` | Get user by ID |
| `POST` | `/api/users` | Create a new user |

### Products Service

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/products` | List all products |
| `GET` | `/api/products?category=electronics` | Filter by category |
| `GET` | `/api/products/:id` | Get product by ID |
| `POST` | `/api/products` | Create a new product |

---

## Testing with PowerShell

### Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health"
```

### Auth Tests
```powershell
# 401 — missing key
Invoke-RestMethod -Uri "http://localhost:3000/api/users"

# 403 — invalid key
Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Headers @{ "x-api-key"="bad-key" }
```

### Users
```powershell
$KEY = @{ "x-api-key" = "key-client-abc-123" }

# List all users
Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Headers $KEY

# Get user by ID
Invoke-RestMethod -Uri "http://localhost:3000/api/users/1" -Headers $KEY

# Create a user
$body = @{ name="Alice"; email="alice@test.com"; role="admin" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Headers $KEY -Body $body -ContentType "application/json"
```

### Products
```powershell
$KEY = @{ "x-api-key" = "key-client-abc-123" }

# List all products
Invoke-RestMethod -Uri "http://localhost:3000/api/products" -Headers $KEY

# Filter by category
Invoke-RestMethod -Uri "http://localhost:3000/api/products?category=electronics" -Headers $KEY

# Get product by ID
Invoke-RestMethod -Uri "http://localhost:3000/api/products/3" -Headers $KEY

# Create a product
$body = @{ name="Mouse"; category="electronics"; price=29.99; stock=100 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/products" -Method POST -Headers $KEY -Body $body -ContentType "application/json"
```

### Rate Limit Test
```powershell
# Run 25 requests rapidly — after 20 you will get 429
$KEY = @{ "x-api-key" = "key-client-abc-123" }
1..25 | ForEach-Object {
  try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Headers $KEY | Out-Null
    Write-Host "Request $_: OK" -ForegroundColor Green
  } catch {
    Write-Host "Request $_: $($_.Exception.Response.StatusCode.value__) Too Many Requests" -ForegroundColor Red
  }
}
```

### Failure Handling Test (502 Bad Gateway)
```powershell
# Stop the users-service container to simulate a backend failure
docker stop users-service

# This should return 502 Bad Gateway
Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Headers @{ "x-api-key"="key-client-abc-123" }

# Restart it
docker start users-service
```

### Inspect Rate Limit Headers
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/users" -Headers @{ "x-api-key"="key-client-abc-123" }
$response.Headers | Where-Object { $_.Key -like "X-RateLimit*" }
```

---

## Docker Commands

```powershell
# Start everything (foreground)
docker compose up --build

# Start in background
docker compose up --build -d

# View gateway logs live
docker logs api-gateway -f

# View all service logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes (clears Redis data)
docker compose down -v

# Rebuild a single service after code change
docker compose build gateway
docker compose up -d gateway
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Manual HTTP proxy** instead of `http-proxy-middleware` | Full control over timeouts (AbortController), error handling, and header stripping |
| **Fail-open rate limiter** | Redis outage should not bring down the gateway |
| **`maxRetriesPerRequest: 0`** | Redis fails fast, does not block request processing |
| **`res.on('finish')` logging** | Captures actual response status and timing after the full response is sent |
| **Single `config/index.js`** | All env vars in one place — easier to audit, test, and change |
| **Backend services ignore auth** | Clean separation: gateway handles all cross-cutting concerns |

---

## Adding a New Backend Service

1. Create `services/my-service/` with an Express app on your chosen port
2. Add to `config.services` in `gateway/src/config/index.js`:
   ```js
   "/api/orders": process.env.ORDERS_SERVICE_URL || "http://localhost:3003",
   ```
3. Add env var to `gateway/.env` and `docker-compose.yml`
4. Add a `Dockerfile` and service entry in `docker-compose.yml`
5. That is it — no other gateway code changes needed
#   P u l s e G a t e - A P I - G a t e w a y - O b s e r v a b i l i t y - P l a t f o r m  
 