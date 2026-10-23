/**
 * utils/redis.js
 *
 * Creates and exports a single shared Redis client using ioredis.
 *
 * Why a single shared client?
 *   Opening a new Redis connection for every request is expensive.
 *   We create one connection at startup and reuse it across all middleware.
 *
 * lazyConnect: true means ioredis won't crash the app immediately if
 * Redis is down on startup — it retries. But if Redis is consistently
 * unavailable, commands will fail and we handle that in the rate limiter.
 */

const Redis = require("ioredis");
const config = require("../config");

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  lazyConnect: true,
  // Fail immediately instead of retrying 20 times — prevents blocking the rate limiter
  maxRetriesPerRequest: 0,
  // Don't spam the console with reconnect messages in production
  showFriendlyErrorStack: process.env.NODE_ENV !== "production",
});

redis.on("connect", () => {
  console.log(`✅ Redis connected at ${config.redis.host}:${config.redis.port}`);
});

redis.on("error", (err) => {
  console.error(`❌ Redis error: ${err.message}`);
});

module.exports = redis;
