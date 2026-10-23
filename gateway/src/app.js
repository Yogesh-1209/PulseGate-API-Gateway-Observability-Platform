/**
 * src/app.js
 *
 * Express application — middleware pipeline in order:
 *
 *   1. express.json()    — parse request bodies
 *   2. logger            — log + record every request in metrics store
 *   3. /dashboard        — admin observability API (NO auth required)
 *   4. auth              — reject invalid/missing API keys
 *   5. rateLimiter       — Redis rate limiting per key
 *   6. proxyRouter       — forward to backend services
 *   7. errorHandler      — format all errors as JSON
 *
 * Dashboard routes are mounted BEFORE auth so the browser dashboard
 * can call /dashboard/sse, /dashboard/metrics etc. without an API key.
 */

const express         = require("express");
const logger          = require("./middleware/logger");
const auth            = require("./middleware/auth");
const rateLimiter     = require("./middleware/rateLimiter");
const proxyRouter     = require("./routes/proxy");
const dashboardRouter = require("./routes/dashboard");
const errorHandler    = require("./middleware/errorHandler");

const app = express();

app.use(express.json());

// 1. Log every request (also feeds metrics store)
app.use(logger);

// 2. Dashboard observability API — public, no API key needed
app.use("/dashboard", dashboardRouter);

// 3. Authenticate API key for all remaining routes
app.use(auth);

// 4. Rate limiting
app.use(rateLimiter);

// 5. Proxy to backend services
app.use(proxyRouter);

// 6. Global error handler
app.use(errorHandler);

module.exports = app;
