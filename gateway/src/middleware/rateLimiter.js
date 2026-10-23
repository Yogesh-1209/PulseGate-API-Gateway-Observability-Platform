/**
 * middleware/rateLimiter.js
 *
 * Redis-based sliding-window rate limiter.
 *
 * Algorithm (Fixed Window Counter):
 *   - Each API key gets a Redis key: "rl:{apiKey}"
 *   - On every request, we INCR that key (atomic increment).
 *   - On the FIRST request (count === 1), we set an EXPIRE so the
 *     window resets automatically after windowSeconds.
 *   - If the count exceeds maxRequests, we return 429 Too Many Requests.
 *
 * Why INCR + EXPIRE instead of a Lua script?
 *   Simple and readable. The tiny race between INCR and EXPIRE is
 *   acceptable here — in production you'd use a Lua script for atomicity.
 *
 * Fail-open strategy:
 *   If Redis is down, we log the error and ALLOW the request through.
 *   This is intentional — a Redis outage should not bring down the gateway.
 *   For strict rate limiting in production, you'd fail-closed instead.
 */

const redis = require("../utils/redis");
const config = require("../config");

module.exports = async function rateLimiter(req, res, next) {
  const apiKey = req.apiKey; // set by auth middleware
  const { maxRequests, windowSeconds } = config.rateLimit;

  const redisKey = `rl:${apiKey}`;

  try {
    // Atomically increment the counter
    const count = await redis.incr(redisKey);

    // On first request in the window, set the expiry
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    // Get remaining TTL so we can tell the client when the window resets
    const ttl = await redis.ttl(redisKey);

    // Set informational rate limit headers (standard practice)
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - count));
    res.setHeader("X-RateLimit-Reset", Math.floor(Date.now() / 1000) + ttl);

    if (count > maxRequests) {
      return res.status(429).json({
        error: {
          status: 429,
          message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowSeconds}s window.`,
          retryAfter: ttl,
        },
      });
    }

    next();
  } catch (err) {
    // Redis is down — fail open (let the request through)
    console.error(`[RateLimit] Redis unavailable, skipping rate limit: ${err.message}`);
    next();
  }
};
