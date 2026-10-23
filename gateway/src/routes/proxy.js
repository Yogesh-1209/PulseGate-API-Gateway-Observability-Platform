/**
 * routes/proxy.js
 *
 * Core routing logic — forwards requests to the correct backend service.
 *
 * How routing works:
 *   config.services maps URL prefixes to backend base URLs:
 *     "/api/users"    → "http://users-service:3001"
 *     "/api/products" → "http://products-service:3002"
 *
 *   When a request arrives for GET /api/users/1:
 *     1. We find the matching prefix: "/api/users"
 *     2. Strip the prefix → "/1"
 *     3. Forward to:  http://users-service:3001/users/1
 *        (we prepend the base path of the service: /users)
 *
 * Why manual proxying instead of http-proxy-middleware?
 *   Manual proxying gives us exact control over:
 *     - Timeout behavior (AbortController)
 *     - Custom error responses
 *     - Clear, readable code without library magic
 *
 * Failure handling:
 *   - Timeout (ECONNABORTED / AbortError) → 504 Gateway Timeout
 *   - Connection refused (service is down) → 502 Bad Gateway
 *   - Any other error → 502 Bad Gateway
 */

const http = require("http");
const https = require("https");
const { URL } = require("url");
const express = require("express");
const config = require("../config");

const router = express.Router();

// Health check — does NOT require an API key (auth runs before proxy,
// but /health is a good smoke test from load balancers too).
// Note: auth middleware already ran by the time we reach here,
// so this is accessible only with a valid key. That's fine for this project.
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
    routes: Object.keys(config.services),
  });
});

/**
 * Dynamic proxy handler.
 * Loops through all configured service prefixes and registers
 * a catch-all route for each one.
 */
Object.entries(config.services).forEach(([prefix, targetBase]) => {
  // Parse the base URL once (e.g. "http://users-service:3001")
  const targetUrl = new URL(targetBase);

  // Express 5 / path-to-regexp v8 requires named wildcards: /*splat
  // This matches: /api/users  /api/users/  /api/users/1  /api/users/1/orders
  router.all([prefix, `${prefix}/*splat`], (req, res, next) => {
    // Tag the upstream service name for the metrics logger
    // "/api/users" → "users",  "/api/products" → "products"
    req.upstream = prefix.replace("/api/", "");

    // Strip the gateway prefix to get the sub-path
    // /api/users/1  →  /1
    const strippedPath = req.path.slice(prefix.length) || "/";

    // Derive the backend service's own base path from the prefix
    // "/api/users" → "/users",  "/api/products" → "/products"
    const servicePath = prefix.replace("/api", "");

    // Full path to forward: /users/1
    const forwardPath = servicePath + (strippedPath === "/" ? "" : strippedPath);

    // Preserve query string (?category=electronics)
    const queryString = req.url.includes("?")
      ? req.url.slice(req.url.indexOf("?"))
      : "";

    const fullPath = (forwardPath || servicePath) + queryString;

    forwardRequest(req, res, next, targetUrl, fullPath);
  });
});

/**
 * Forwards the request to a backend service.
 *
 * @param {import('express').Request}  req        - Incoming gateway request
 * @param {import('express').Response} res        - Gateway response to client
 * @param {Function}                   next       - Express next (for error handler)
 * @param {URL}                        targetUrl  - Parsed base URL of backend
 * @param {string}                     path       - Path + query to forward
 */
function forwardRequest(req, res, next, targetUrl, path) {
  // AbortController lets us cancel the outgoing request after a timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, config.proxyTimeout);

  const isHttps = targetUrl.protocol === "https:";
  const lib = isHttps ? https : http;

  // Build forwarded headers — strip x-api-key and content-length
  // (we use destructuring to remove them cleanly; setting to undefined in
  //  http.request options sends the literal string "undefined")
  const { "x-api-key": _apiKey, "content-length": _cl, ...forwardHeaders } = req.headers;

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (isHttps ? 443 : 80),
    path,
    method: req.method,
    headers: {
      ...forwardHeaders,
      // Override host header to point to backend (not the gateway)
      host: targetUrl.host,
      // Tell the backend which original client IP made the request
      "x-forwarded-for": req.ip,
      "x-forwarded-host": req.hostname,
    },
    signal: controller.signal,
  };

  const proxyReq = lib.request(options, (proxyRes) => {
    clearTimeout(timeoutId);

    // Stream the backend status code and headers to the client
    res.status(proxyRes.statusCode);
    Object.entries(proxyRes.headers).forEach(([key, value]) => {
      // Skip hop-by-hop headers that shouldn't be forwarded
      if (!["connection", "keep-alive", "transfer-encoding"].includes(key)) {
        res.setHeader(key, value);
      }
    });

    // Pipe the backend response body directly to the client
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    clearTimeout(timeoutId);

    if (err.name === "AbortError" || err.code === "ECONNABORTED") {
      return next(createError(504, `Backend timeout after ${config.proxyTimeout}ms`));
    }

    if (err.code === "ECONNREFUSED") {
      return next(createError(502, `Backend service unavailable: ${targetUrl.host}`));
    }

    return next(createError(502, `Bad gateway: ${err.message}`));
  });

  // Forward request body only for methods that carry one
  const methodsWithBody = ["POST", "PUT", "PATCH"];
  if (methodsWithBody.includes(req.method) && req.body && Object.keys(req.body).length > 0) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }

  proxyReq.end();
}

/** Small helper to create an error object with a status code */
function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// 404 catch-all for unmatched routes
router.use((req, res) => {
  res.status(404).json({
    error: {
      status: 404,
      message: `No route configured for: ${req.method} ${req.path}`,
      availableRoutes: Object.keys(config.services),
    },
  });
});

module.exports = router;
