/**
 * routes/dashboard.js
 *
 * Admin dashboard API — mounted BEFORE auth middleware so no API key is required.
 * These are read-only observability endpoints; no gateway behavior is changed.
 *
 * Endpoints:
 *   GET /dashboard/metrics      — aggregate snapshot (totals, avg RT, RPS…)
 *   GET /dashboard/logs         — recent request log entries
 *   GET /dashboard/timeseries   — last 60-second buckets for charts
 *   GET /dashboard/services     — live health of every downstream service + Redis
 *   GET /dashboard/rate-limits  — per-key Redis quotas
 *   GET /dashboard/sse          — Server-Sent Events stream (real-time push)
 */

const http    = require("http");
const express = require("express");
const router  = express.Router();
const store   = require("../metrics/store");
const redis   = require("../utils/redis");
const config  = require("../config");

// ── Helper: health-check a single backend service ────────────────────────────

function checkService(baseUrl, name) {
  return new Promise((resolve) => {
    const start   = Date.now();
    let settled   = false;

    const done = (result) => {
      if (!settled) { settled = true; resolve(result); }
    };

    try {
      const url = new URL(`${baseUrl}/health`);
      const req = http.get(
        { hostname: url.hostname, port: url.port || 80, path: "/health", timeout: 2500 },
        (res) => {
          const rt = Date.now() - start;
          // consume body so the socket is freed
          res.resume();
          done({ name, status: res.statusCode === 200 ? "healthy" : "degraded", responseTime: rt });
        }
      );
      req.on("error", () => done({ name, status: "down",    responseTime: null }));
      req.on("timeout", () => { req.destroy(); done({ name, status: "timeout", responseTime: null }); });
    } catch {
      done({ name, status: "down", responseTime: null });
    }
  });
}

async function getServicesHealth() {
  // Run all checks in parallel
  const [usersHealth, productsHealth] = await Promise.all([
    checkService(config.services["/api/users"],    "Users Service"),
    checkService(config.services["/api/products"], "Products Service"),
  ]);

  let redisHealth;
  try {
    const start = Date.now();
    await redis.ping();
    redisHealth = { name: "Redis", status: "healthy", responseTime: Date.now() - start };
  } catch {
    redisHealth = { name: "Redis", status: "down", responseTime: null };
  }

  return {
    gateway:         { name: "API Gateway",      status: "healthy", responseTime: 0 },
    redis:           redisHealth,
    usersService:    usersHealth,
    productsService: productsHealth,
    checkedAt:       new Date().toISOString(),
  };
}

// ── REST endpoints ────────────────────────────────────────────────────────────

router.get("/metrics", (_req, res) => {
  res.json(store.getSnapshot());
});

router.get("/logs", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  res.json(store.getLogs(limit));
});

router.get("/timeseries", (_req, res) => {
  res.json(store.getTimeSeries());
});

router.get("/services", async (_req, res) => {
  try {
    res.json(await getServicesHealth());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/rate-limits", async (_req, res) => {
  try {
    const keys = await redis.keys("rl:*");
    const quotas = await Promise.all(
      keys.map(async (key) => {
        const [count, ttl] = await Promise.all([redis.get(key), redis.ttl(key)]);
        return {
          key:    key.replace("rl:", ""),
          used:   parseInt(count, 10) || 0,
          ttl:    ttl > 0 ? ttl : 0,
          max:    config.rateLimit.maxRequests,
          window: config.rateLimit.windowSeconds,
        };
      })
    );
    res.json({ quotas, rateLimitEvents: store.getSnapshot().rateLimitEvents });
  } catch {
    res.json({ quotas: [], rateLimitEvents: store.getSnapshot().rateLimitEvents, error: "Redis unavailable" });
  }
});

// ── SSE endpoint — real-time push to dashboard clients ───────────────────────

router.get("/sse", async (req, res) => {
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering for SSE

  // Flush headers immediately so the browser establishes the stream
  if (res.flushHeaders) res.flushHeaders();

  const send = (event, data) => {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch { /* client gone */ }
  };

  // ── Send initial state ────────────────────────────────────────────────
  send("metrics",    store.getSnapshot());
  send("logs",       store.getLogs(50));
  send("timeseries", store.getTimeSeries());
  getServicesHealth().then((h) => send("services", h)).catch(() => {});

  // ── Subscribe to live events ──────────────────────────────────────────
  const onLog    = (log)    => send("log",    log);
  const onBucket = (bucket) => { send("bucket", bucket); send("metrics", store.getSnapshot()); };

  store.on("log",    onLog);
  store.on("bucket", onBucket);

  // Refresh service health every 10 s
  const healthTimer = setInterval(
    () => getServicesHealth().then((h) => send("services", h)).catch(() => {}),
    10_000
  );

  // Keepalive comment every 25 s — prevents proxy / load-balancer timeouts
  const pingTimer = setInterval(() => { try { res.write(": ping\n\n"); } catch { /* ignore */ } }, 25_000);

  // ── Cleanup on disconnect ─────────────────────────────────────────────
  req.on("close", () => {
    store.removeListener("log",    onLog);
    store.removeListener("bucket", onBucket);
    clearInterval(healthTimer);
    clearInterval(pingTimer);
  });
});

module.exports = router;
