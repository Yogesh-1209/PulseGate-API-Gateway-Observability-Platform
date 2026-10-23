/**
 * middleware/auth.js
 *
 * API Key Authentication.
 *
 * Clients must include their key in the request header:
 *   x-api-key: key-client-abc-123
 *
 * How it works:
 *   1. Read the x-api-key header from the request.
 *   2. Check it against the list of valid keys in config.
 *   3. If missing → 401 Unauthorized.
 *   4. If invalid → 403 Forbidden (key present but not recognized).
 *   5. If valid   → attach the key to req.apiKey and call next().
 *
 * Why attach req.apiKey?
 *   Downstream middleware (rate limiter) needs to know WHICH key
 *   made the request so it can apply per-key limits.
 */

const config = require("../config");

module.exports = function auth(req, res, next) {
  // Skip auth for the health check endpoint
  if (req.path === "/health") return next();

  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({
      error: {
        status: 401,
        message: "Missing API key. Add header: x-api-key: <your-key>",
      },
    });
  }

  if (!config.apiKeys.includes(apiKey)) {
    return res.status(403).json({
      error: {
        status: 403,
        message: "Invalid API key.",
      },
    });
  }

  // Attach the validated key for use by downstream middleware
  req.apiKey = apiKey;
  next();
};
