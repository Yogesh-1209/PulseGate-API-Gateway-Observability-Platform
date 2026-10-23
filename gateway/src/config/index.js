/**
 * config/index.js
 *
 * Central configuration file.
 * All environment variables are read here and exported as a single config object.
 * This means the rest of the code never calls process.env directly — only this file does.
 * Easier to manage, easier to test, easier to audit secrets.
 */

require("dotenv").config();

const config = {
  // Gateway server port
  port: process.env.PORT || 3000,

  // Comma-separated list of valid API keys
  // e.g. API_KEYS=key-abc-123,key-xyz-456
  apiKeys: process.env.API_KEYS
    ? process.env.API_KEYS.split(",").map((k) => k.trim())
    : [],

  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },

  rateLimit: {
    // Max requests per window per API key
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    // Window duration in seconds
    windowSeconds: parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS, 10) || 60,
  },

  // Timeout in ms to wait for a backend service response
  proxyTimeout: parseInt(process.env.PROXY_TIMEOUT_MS, 10) || 5000,

  /**
   * Service routing map.
   * Key   = URL prefix the gateway listens for (e.g. /api/users)
   * Value = Base URL of the backend service
   *
   * When a request comes in for /api/users/profile,
   * the gateway strips /api/users and forwards /profile to the users service.
   */
  services: {
    "/api/users": process.env.USERS_SERVICE_URL || "http://localhost:3001",
    "/api/products":
      process.env.PRODUCTS_SERVICE_URL || "http://localhost:3002",
  },
};

module.exports = config;
