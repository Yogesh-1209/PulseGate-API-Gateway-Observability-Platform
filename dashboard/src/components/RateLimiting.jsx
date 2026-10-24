/**
 * RateLimiting — per-key quota bars + 429 event chart.
 * Quota data is polled from /dashboard/rate-limits every 5 s (Redis).
 * The 429 time-series comes from the same SSE bucket data as LiveTraffic.
 */

import { Shield, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

const TT_STYLE = {
  contentStyle: {
    background: "#131929",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 6,
    fontSize: 11,
    color: "#d1d9e6",
    padding: "7px 11px",
  },
};

const AXIS_PROPS = {
  stroke: "transparent",
  tick: { fill: "#4a5568", fontSize: 10 },
};

export default function RateLimiting({ rateLimits, timeSeries }) {
  const { quotas = [], rateLimitEvents = 0, error } = rateLimits || {};

  const rlChart = (timeSeries || []).map((b) => ({
    t:  fmtTime(b.timestamp),
    rl: b.rateLimit || 0,
  }));

  const hasRlActivity = rlChart.some((d) => d.rl > 0);

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <Shield size={13} />
          Rate Limiting
        </div>
        {error && (
          <span style={{ fontSize: 11, color: "var(--amber)", display: "flex", alignItems: "center", gap: 4 }}>
            <AlertTriangle size={12} />
            {error}
          </span>
        )}
      </div>

      <div className="rl-grid">
        {/* ─ Active quotas from Redis ─ */}
        <div className="card">
          <div className="card-label">
            <Shield size={11} />
            Active Quota Windows (Redis)
          </div>

          {quotas.length === 0 ? (
            <div className="empty-state" style={{ padding: "20px 0" }}>
              <Shield size={24} opacity={0.2} />
              <span>No active windows — make requests to populate quota data.</span>
            </div>
          ) : (
            quotas.map((q) => {
              const pct  = Math.min((q.used / q.max) * 100, 100);
              const warn = pct >= 80;
              const over = q.used >= q.max;
              return (
                <div key={q.key} className="quota-row">
                  <div className="quota-meta">
                    <span className="quota-key" title={q.key}>{q.key}</span>
                    <span
                      className="quota-count"
                      style={{ color: over ? "var(--red)" : warn ? "var(--amber)" : "var(--text-2)" }}
                    >
                      {q.used} / {q.max}
                    </span>
                  </div>
                  <div className="quota-bar">
                    <div
                      className={`quota-fill ${over ? "over" : warn ? "warn" : ""}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="quota-ttl">
                    resets in {q.ttl}s · window: {q.window}s
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─ 429 events ─ */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div className="card-label">
              <AlertTriangle size={11} />
              HTTP 429 Events
            </div>
            <div className="rl-events-val">{rateLimitEvents}</div>
            <div className="rl-events-label">Total rate-limit rejections</div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              429s per second · last 60s
            </div>
            {!hasRlActivity ? (
              <div className="empty-state" style={{ padding: "16px 0", fontSize: 11 }}>
                No 429s recorded in the current window.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={rlChart} margin={{ top: 2, right: 4, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="t" {...AXIS_PROPS} interval="preserveStartEnd" />
                  <YAxis {...AXIS_PROPS} allowDecimals={false} />
                  <Tooltip {...TT_STYLE} formatter={(v) => [v, "Rate limited"]} />
                  <Bar dataKey="rl" name="429s" fill="#f87171" radius={[2, 2, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
