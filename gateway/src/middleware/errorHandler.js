/**
 * middleware/errorHandler.js
 *
 * Global error handler — Express recognizes a 4-argument middleware as an error handler.
 * Any middleware that calls next(err) or throws inside async code lands here.
 *
 * Returns a consistent JSON error shape so clients always know what to expect.
 */
module.exports = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[ERROR] ${req.method} ${req.path} → ${status}: ${message}`);

  res.status(status).json({
    error: {
      status,
      message,
      path: req.path,
      timestamp: new Date().toISOString(),
    },
  });
};
