/**
 * hooks/useGatewayData.js
 *
 * Central data hook for the dashboard.
 *
 * Strategy:
 *   1. On mount, fetch initial data from REST endpoints so the UI isn't blank.
 *   2. Open an SSE connection to /dashboard/sse.
 *   3. Handle SSE events:
 *        metrics    → update aggregate counters
 *        log        → prepend to log list (newest first), keep ≤ 100
 *        bucket     → append to time-series, keep ≤ 60 points
 *        timeseries → replace full time-series (sent once on connect)
 *        logs       → replace full log list (sent once on connect)
 *        services   → update service health
 *   4. On SSE error the browser auto-reconnects; we flip `connected` flag.
 *   5. Polling for /dashboard/rate-limits every 5 s (Redis data, not SSE'd).
 */

import { useState, useEffect, useRef } from "react";

const EMPTY_METRICS = {
  uptime: 0, totalRequests: 0, successRequests: 0,
  failedRequests: 0, rateLimitEvents: 0,
  avgResponseTime: 0, requestsPerSecond: 0, successRate: 100,
};

const EMPTY_SERVICES = {
  gateway:         { name: "API Gateway",      status: "unknown" },
  redis:           { name: "Redis",            status: "unknown" },
  usersService:    { name: "Users Service",    status: "unknown" },
  productsService: { name: "Products Service", status: "unknown" },
};

export function useGatewayData() {
  const [metrics,    setMetrics]    = useState(EMPTY_METRICS);
  const [logs,       setLogs]       = useState([]);
  const [timeSeries, setTimeSeries] = useState([]);
  const [services,   setServices]   = useState(EMPTY_SERVICES);
  const [rateLimits, setRateLimits] = useState({ quotas: [], rateLimitEvents: 0 });
  const [connected,  setConnected]  = useState(false);

  const esRef = useRef(null);

  // ── SSE connection ────────────────────────────────────────────────────────
  useEffect(() => {
    function connect() {
      if (esRef.current) { esRef.current.close(); }

      const es = new EventSource("/dashboard/sse");
      esRef.current = es;

      es.addEventListener("metrics", (e) => {
        setMetrics(JSON.parse(e.data));
        setConnected(true);
      });

      es.addEventListener("log", (e) => {
        const log = JSON.parse(e.data);
        setLogs((prev) => [log, ...prev].slice(0, 100));
      });

      es.addEventListener("logs", (e) => {
        setLogs(JSON.parse(e.data));
        setConnected(true);
      });

      es.addEventListener("bucket", (e) => {
        const b = JSON.parse(e.data);
        setTimeSeries((prev) => [...prev, b].slice(-60));
      });

      es.addEventListener("timeseries", (e) => {
        setTimeSeries(JSON.parse(e.data));
      });

      es.addEventListener("services", (e) => {
        setServices(JSON.parse(e.data));
      });

      es.onerror = () => {
        setConnected(false);
        // EventSource auto-reconnects; we just update the UI state
      };
    }

    connect();
    return () => { if (esRef.current) esRef.current.close(); };
  }, []);

  // ── Poll rate limits every 5 s ────────────────────────────────────────────
  useEffect(() => {
    const poll = () =>
      fetch("/dashboard/rate-limits")
        .then((r) => r.json())
        .then(setRateLimits)
        .catch(() => {});

    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  return { metrics, logs, timeSeries, services, rateLimits, connected };
}
