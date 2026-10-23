/**
 * middleware/logger.js
 *
 * Request/Response logger + metrics recorder.
 *
 * Uses res.on('finish') so we capture the actual status code and total
 * processing time AFTER Express has sent the response.
 *
 * Also calls store.record() to update the in-memory metrics store that
 * powers the dashboard. Dashboard API calls (/dashboard/*) are excluded
 * from metrics so they don't pollute charts.
 */

const store = require("../metrics/store");

module.exports = function logger(req, res, next) {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;

    // ── Record in metrics store (skip internal dashboard calls) ──────────
    if (!req.path.startsWith("/dashboard")) {
      store.record({
        method:   req.method,
        path:     req.originalUrl,
        status,
        duration,
        upstream: req.upstream || null, // set by proxy.js for proxied requests
      });
    }

    // ── Console output ───────────────────────────────────────────────────
    const apiKey = req.apiKey ? `...${req.apiKey.slice(-6)}` : "no-key";
    const color  = getStatusColor(status);
    const reset  = "\x1b[0m";

    console.log(
      `${color}[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${status} (${duration}ms) [key: ${apiKey}]${reset}`
    );
  });

  next();
};

function getStatusColor(status) {
  if (status >= 500) return "\x1b[31m"; // red
  if (status >= 400) return "\x1b[33m"; // yellow
  if (status >= 300) return "\x1b[36m"; // cyan
  return "\x1b[32m";                    // green
}
