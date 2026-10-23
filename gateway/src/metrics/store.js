/**
 * metrics/store.js
 *
 * Singleton in-memory metrics store.
 * Extends EventEmitter so the dashboard SSE route can subscribe
 * to new logs and bucket flushes in real time without polling.
 *
 * Lifecycle:
 *   - logger middleware calls store.record() after every response
 *   - A setInterval flushes one bucket per second into timeSeries
 *   - Dashboard routes read from store.getSnapshot() / store.getLogs() etc.
 *   - SSE clients subscribe to 'log' and 'bucket' events
 */

const EventEmitter = require("events");

const MAX_LOGS = 200;        // circular buffer size for request logs
const MAX_TIMESERIES = 60;   // seconds of time-series data to keep

class MetricsStore extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200); // support many concurrent SSE clients

    this.startTime = Date.now();

    // Aggregate totals (never reset)
    this.counters = {
      total: 0,
      success: 0,        // status < 400
      failed: 0,         // status >= 400
      rateLimit: 0,      // status === 429
      totalDuration: 0,  // ms, for computing avg
    };

    // Circular log buffer — newest entry at index 0
    this.logs = [];

    // One bucket per second, last 60 seconds
    this.timeSeries = [];
    this._bucket = this._newBucket();

    // Flush every second — unref so the timer doesn't block process exit
    this._timer = setInterval(() => this._flush(), 1000);
    if (this._timer.unref) this._timer.unref();
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _newBucket(ts = Date.now()) {
    return { timestamp: ts, requests: 0, success: 0, failed: 0, rateLimit: 0, totalDuration: 0, avgDuration: 0 };
  }

  _flush() {
    const b = { ...this._bucket };
    b.avgDuration = b.requests > 0 ? Math.round(b.totalDuration / b.requests) : 0;

    this.timeSeries.push(b);
    if (this.timeSeries.length > MAX_TIMESERIES) this.timeSeries.shift();

    this._bucket = this._newBucket();
    this.emit("bucket", b);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Record a completed request. Called by the logger middleware.
   * @param {{ method, path, status, duration, upstream }} entry
   */
  record({ method, path, status, duration, upstream }) {
    const ok = status < 400;
    const rl = status === 429;

    this.counters.total++;
    if (ok) this.counters.success++; else this.counters.failed++;
    if (rl) this.counters.rateLimit++;
    this.counters.totalDuration += duration;

    this._bucket.requests++;
    if (ok) this._bucket.success++; else this._bucket.failed++;
    if (rl) this._bucket.rateLimit++;
    this._bucket.totalDuration += duration;

    const log = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      method,
      path,
      status,
      duration,
      upstream: upstream || "gateway",
    };

    this.logs.unshift(log);
    if (this.logs.length > MAX_LOGS) this.logs.pop();

    this.emit("log", log);
  }

  /** Aggregate snapshot — returned by GET /dashboard/metrics */
  getSnapshot() {
    const { total, success, failed, rateLimit, totalDuration } = this.counters;
    const uptimeMs = Date.now() - this.startTime;

    return {
      uptime: uptimeMs,
      totalRequests: total,
      successRequests: success,
      failedRequests: failed,
      rateLimitEvents: rateLimit,
      avgResponseTime: total > 0 ? Math.round(totalDuration / total) : 0,
      requestsPerSecond: uptimeMs > 0 ? parseFloat((total / (uptimeMs / 1000)).toFixed(2)) : 0,
      successRate: total > 0 ? parseFloat(((success / total) * 100).toFixed(1)) : 100.0,
    };
  }

  /** Most recent request logs, newest first */
  getLogs(limit = 50) {
    return this.logs.slice(0, Math.min(limit, MAX_LOGS));
  }

  /** Full time-series array (up to 60 one-second buckets) */
  getTimeSeries() {
    return [...this.timeSeries];
  }
}

// Export as singleton — shared across the entire process
module.exports = new MetricsStore();
