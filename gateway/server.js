/**
 * server.js
 *
 * Entry point. Starts the HTTP server on the configured port.
 * Keeping this separate from app.js is a standard practice —
 * tests can import app.js without binding a port.
 */

const app = require("./src/app");
const config = require("./src/config");

const server = app.listen(config.port, () => {
  console.log(`\n🚀 API Gateway running on port ${config.port}`);
  console.log(`📋 Routing table:`);

  Object.entries(config.services).forEach(([prefix, url]) => {
    console.log(`   ${prefix}  →  ${url}`);
  });

  console.log(
    `\n🔒 Rate limit: ${config.rateLimit.maxRequests} requests / ${config.rateLimit.windowSeconds}s`
  );
  console.log(`⏱  Proxy timeout: ${config.proxyTimeout}ms\n`);
});

// Graceful shutdown — close the server cleanly on SIGTERM (e.g. Docker stop)
process.on("SIGTERM", () => {
  console.log("SIGTERM received — shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
