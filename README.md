# PulseGate — API Gateway & Observability Platform

A production-style API Gateway built with **Node.js, Express, Redis, and Docker**. PulseGate authenticates API keys, rate-limits requests using Redis, routes traffic to backend microservices, logs requests, and handles backend failures gracefully.

## Architecture

```text
                       Client Request
                             |
                             v
                +--------------------------+
                |    API Gateway :3000    |
                +--------------------------+
                             |
                +------------+-------------+
                |            |             |
                v            v             v
             Logger        Auth       Rate Limiter
                                          |
                                          v
                                        Redis
                                          |
                                          v
                                     Proxy Router
                                          |
                             +------------+------------+
                             |                         |
                             v                         v
                    +----------------+       +------------------+
                    | Users Service  |       | Products Service |
                    |     :3001      |       |      :3002       |
                    +----------------+       +------------------+

                        Monitoring Dashboard
                             :5173
```

The gateway serves as a single entry point for backend services. Requests pass through logging, authentication, rate limiting, proxy routing, and error handling.

## Features

- **API Key Authentication:** Validates the `x-api-key` header.
- **Redis Rate Limiting:** Tracks requests per API key using Redis `INCR` and `EXPIRE`.
- **Request Logging:** Records timestamps, HTTP methods, paths, response statuses, and durations.
- **Reverse Proxy:** Routes incoming requests to the appropriate backend service.
- **Error Handling:** Handles backend failures, request timeouts, and other errors.
- **Microservices Architecture:** Separates gateway logic from users and products services.
- **Docker Compose:** Runs the configured services in a shared network.
- **Monitoring Dashboard:** Provides a frontend for inspecting API activity and service health.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | HTTP server and middleware |
| Redis | Rate-limit counters |
| React | Dashboard frontend |
| Vite | Frontend development server and build tooling |
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| Git & GitHub | Version control |

## Project Structure

```text
api-gateway/
├── dashboard/
│   └── ...                     # Frontend dashboard
│
├── gateway/
│   ├── src/
│   │   ├── config/
│   │   │   └── index.js        # Centralized configuration
│   │   ├── middleware/
│   │   │   ├── auth.js         # API key validation
│   │   │   ├── rateLimiter.js  # Redis rate limiting
│   │   │   ├── logger.js       # Request logging
│   │   │   └── errorHandler.js # Global error handling
│   │   ├── routes/
│   │   │   └── proxy.js        # Backend proxy routing
│   │   └── utils/
│   │       └── redis.js        # Redis client
│   ├── .env                    # Local environment configuration
│   ├── Dockerfile
│   ├── package.json
│   └── server.js               # Gateway entry point
│
├── services/
│   ├── users-service/
│   │   ├── src/app.js
│   │   ├── Dockerfile
│   │   └── server.js
│   └── products-service/
│       ├── src/app.js
│       ├── Dockerfile
│       └── server.js
│
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js and npm](https://nodejs.org/)
- [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone https://github.com/Yogesh-1209/PulseGate-API-Gateway-Observability-Platform.git
cd PulseGate-API-Gateway-Observability-Platform
```

### 2. Start the backend services

From the project root, run:

```bash
docker compose up --build -d
```

This builds the configured Docker images and starts the services in the background.

Verify that the containers are running:

```bash
docker compose ps
```

All configured services communicate through the internal `api-net` Docker network. Only the gateway is intended to be exposed to the host according to the original configuration.

### 3. Start the frontend dashboard

Open a separate terminal in the project root and run:

```powershell
cd dashboard
npm install
npm run dev
```

Vite will print the local development URL in the terminal. The default is usually:

**http://localhost:5173**

Keep this terminal running while using the dashboard.

### 4. Access the application

| Component | URL |
|---|---|
| Monitoring Dashboard | http://localhost:5173 |
| API Gateway | http://localhost:3000 |
| Gateway Health Check | http://localhost:3000/health |
| Users API | http://localhost:3000/api/users |
| Products API | http://localhost:3000/api/products |

The dashboard runs separately using Vite unless it has also been configured as a Docker Compose service.

## Configuration

Gateway configuration lives in `gateway/.env` for local development and/or the environment section of `docker-compose.yml` for Docker.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Gateway listening port |
| `API_KEYS` | Configured locally | Comma-separated valid API keys |
| `REDIS_HOST` | `redis` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `RATE_LIMIT_MAX` | `20` | Maximum requests per window per key |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Rate-limit window duration in seconds |
| `PROXY_TIMEOUT_MS` | `5000` | Maximum wait for a backend response |
| `USERS_SERVICE_URL` | Environment-dependent | Users service base URL |
| `PRODUCTS_SERVICE_URL` | Environment-dependent | Products service base URL |

**Security note:** Keep real API keys and credentials out of version control. Ensure `gateway/.env` is appropriately excluded in `.gitignore`.

## API Reference

All requests except `/health` require an API key in the following header:

```http
x-api-key: key-client-abc-123
```

The key above is the development/demo key documented for this project. It must match the key configured in your environment.

### Gateway

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Gateway health check; no authentication required |

### Users Service

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users` | List all users |
| `GET` | `/api/users/:id` | Get a user by ID |
| `POST` | `/api/users` | Create a new user |

### Products Service

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/products` | List all products |
| `GET` | `/api/products?category=electronics` | Filter products by category |
| `GET` | `/api/products/:id` | Get a product by ID |
| `POST` | `/api/products` | Create a new product |

## Testing with PowerShell

Run these examples after starting the backend.

### Health Check

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health"
```

### Authentication Tests

A missing key should return `401 Unauthorized`; an invalid key should return `403 Forbidden`.

```powershell
# 401 - missing key
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/users"
}
catch {
    [int]$_.Exception.Response.StatusCode
}

# 403 - invalid key
try {
    Invoke-RestMethod `
        -Uri "http://localhost:3000/api/users" `
        -Headers @{ "x-api-key" = "bad-key" }
}
catch {
    [int]$_.Exception.Response.StatusCode
}
```

### Users

```powershell
$KEY = @{ "x-api-key" = "key-client-abc-123" }

# List all users
Invoke-RestMethod `
    -Uri "http://localhost:3000/api/users" `
    -Headers $KEY

# Get user by ID
Invoke-RestMethod `
    -Uri "http://localhost:3000/api/users/1" `
    -Headers $KEY

# Create a user
$body = @{
    name  = "Alice"
    email = "alice@test.com"
    role  = "admin"
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:3000/api/users" `
    -Method POST `
    -Headers $KEY `
    -Body $body `
    -ContentType "application/json"
```

### Products

```powershell
$KEY = @{ "x-api-key" = "key-client-abc-123" }

# List all products
Invoke-RestMethod `
    -Uri "http://localhost:3000/api/products" `
    -Headers $KEY

# Filter by category
Invoke-RestMethod `
    -Uri "http://localhost:3000/api/products?category=electronics" `
    -Headers $KEY

# Get product by ID
Invoke-RestMethod `
    -Uri "http://localhost:3000/api/products/3" `
    -Headers $KEY

# Create a product
$body = @{
    name     = "Mouse"
    category = "electronics"
    price    = 29.99
    stock    = 100
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:3000/api/products" `
    -Method POST `
    -Headers $KEY `
    -Body $body `
    -ContentType "application/json"
```

The request bodies must match the fields expected by the relevant backend service.

### Rate Limit Test

The documented default limit is 20 requests per 60-second window per API key.

```powershell
$KEY = @{ "x-api-key" = "key-client-abc-123" }

1..25 | ForEach-Object {
    try {
        Invoke-RestMethod `
            -Uri "http://localhost:3000/api/users" `
            -Headers $KEY | Out-Null

        Write-Host "Request $_ : OK" -ForegroundColor Green
    }
    catch {
        $status = [int]$_.Exception.Response.StatusCode
        Write-Host "Request $_ : HTTP $status" -ForegroundColor Red
    }
}
```

Requests beyond the configured limit should return `429 Too Many Requests`. The exact result depends on requests already made during the current rate-limit window.

### Failure Handling Test

This test simulates a stopped users backend.

First, stop the service:

```powershell
docker compose stop users-service
```

Then send a request to the gateway:

```powershell
$KEY = @{ "x-api-key" = "key-client-abc-123" }

Invoke-RestMethod `
    -Uri "http://localhost:3000/api/users" `
    -Headers $KEY
```

The gateway is expected to return a backend error, typically `502 Bad Gateway`, depending on the implementation.

Restart the service:

```powershell
docker compose start users-service
```

### Inspect Rate Limit Headers

```powershell
$KEY = @{ "x-api-key" = "key-client-abc-123" }

$response = Invoke-WebRequest `
    -Uri "http://localhost:3000/api/users" `
    -Headers $KEY

$response.Headers
```

Inspect the response headers for any rate-limit fields provided by the implementation.

## Docker Commands

Run these commands from the directory containing `docker-compose.yml`.

| Command | Description |
|---|---|
| `docker compose up --build` | Build and start services in the foreground |
| `docker compose up --build -d` | Build and start services in the background |
| `docker compose ps` | Show service status |
| `docker compose logs -f` | Follow logs from all services |
| `docker compose logs -f gateway` | Follow gateway logs |
| `docker compose stop` | Stop services without removing containers |
| `docker compose start` | Start stopped services |
| `docker compose down` | Stop and remove containers and network |
| `docker compose down -v` | Also remove Compose-managed named volumes |
| `docker compose build gateway` | Rebuild the gateway image |
| `docker compose up -d gateway` | Start or recreate the gateway service |

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Manual HTTP proxy instead of a proxy middleware library | Provides control over forwarding, timeouts, and error handling |
| Fail-open rate limiter | Redis outages do not block requests solely because the rate limiter is unavailable |
| `maxRetriesPerRequest: 0` | Configures the Redis client to avoid retrying individual commands indefinitely |
| `res.on('finish')` logging | Captures final response status and request duration |
| Centralized `config/index.js` | Keeps environment configuration in one place |
| Authentication at the gateway | Separates cross-cutting concerns from backend business logic |

## Adding a New Backend Service

To extend the gateway with another service, such as an orders service:

1. Create `services/orders-service/` with an Express application.
2. Configure the service's base URL and routing prefix in the gateway configuration.
3. Add an `ORDERS_SERVICE_URL` environment variable where required.
4. Add the service's `Dockerfile` and Compose service definition.
5. Ensure the proxy router supports the new route and prefix.
6. Test the route through the gateway.

Example configuration entry:

```javascript
"/api/orders": process.env.ORDERS_SERVICE_URL || "http://localhost:3003"
```

Inside Docker, use the appropriate Compose service hostname and port rather than assuming `localhost` refers to another container.

## Future Improvements

- JWT authentication and role-based access control
- Per-client rate-limit policies
- Historical API traffic analytics
- Distributed tracing and structured logging
- Circuit breakers and configurable retries
- Automated integration tests
- Production deployment with HTTPS and secret management

## License

Add a `LICENSE` file if you intend to distribute the project under a specific open-source license.

---

**PulseGate — One entry point. Clear visibility. Better API control.**
