/**
 * Overview — four compact KPI cards.
 *
 * Fixes:
 *   - Success rate shows "—" (not 100%) when there are zero requests.
 *   - P95 latency note: the backend only exposes avg, so we label it honestly.
 */

function successRateDisplay(metrics) {
  if (!metrics || metrics.totalRequests === 0) return "—";
  return `${metrics.successRate}%`;
}

function successTrend(metrics) {
  if (!metrics || metrics.totalRequests === 0) return { cls: "neutral", text: "No data yet" };
  const r = metrics.successRate;
  if (r >= 99) return { cls: "good", text: "Excellent" };
  if (r >= 95) return { cls: "good", text: "Good" };
  if (r >= 90) return { cls: "warn", text: "Degraded" };
  return { cls: "bad", text: "High error rate" };
}

function latencyTrend(ms) {
  if (!ms) return { cls: "neutral", text: "No data yet" };
  if (ms < 100)  return { cls: "good", text: "Excellent" };
  if (ms < 300)  return { cls: "good", text: "Good" };
  if (ms < 1000) return { cls: "warn", text: "Elevated" };
  return { cls: "bad", text: "Very slow" };
}

export default function Overview({ metrics }) {
  const m = metrics || {};
  const hasData = m.totalRequests > 0;
  const st = successTrend(m);
  const lt = latencyTrend(m.avgResponseTime);

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 10h2v4H2zM6 6h2v8H6zM10 8h2v6h-2zM14 2h2v12h-2z" />
          </svg>
          KPIs
        </div>
      </div>

      <div className="kpi-grid">
        {/* Total Requests */}
        <div className="kpi-card fade-up">
          <div className="kpi-label">Total Requests</div>
          <div className="kpi-value">{m.totalRequests?.toLocaleString() ?? "0"}</div>
          <div className="kpi-sub">Since gateway start</div>
        </div>

        {/* Success Rate */}
        <div className="kpi-card fade-up" style={{ animationDelay: "40ms" }}>
          <div className="kpi-label">Success Rate</div>
          <div className="kpi-value" style={{ color: !hasData ? "var(--text-3)" : undefined }}>
            {successRateDisplay(m)}
          </div>
          <div className={`kpi-trend ${st.cls}`}>{st.text}</div>
        </div>

        {/* Failed Requests */}
        <div className="kpi-card fade-up" style={{ animationDelay: "80ms" }}>
          <div className="kpi-label">Failed Requests</div>
          <div className="kpi-value" style={{ color: m.failedRequests > 0 ? "var(--red)" : undefined }}>
            {m.failedRequests?.toLocaleString() ?? "0"}
          </div>
          <div className="kpi-sub">
            {m.rateLimitEvents > 0
              ? `incl. ${m.rateLimitEvents} rate-limited`
              : "4xx + 5xx responses"}
          </div>
        </div>

        {/* Avg Response Time (labeled as avg, not p95, since backend only has avg) */}
        <div className="kpi-card fade-up" style={{ animationDelay: "120ms" }}>
          <div className="kpi-label">Avg Latency</div>
          <div className="kpi-value">
            {hasData ? `${m.avgResponseTime}ms` : "—"}
          </div>
          <div className={`kpi-trend ${lt.cls}`}>{lt.text}</div>
        </div>
      </div>
    </div>
  );
}
