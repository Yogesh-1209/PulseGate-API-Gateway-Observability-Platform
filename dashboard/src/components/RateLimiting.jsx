import { Shield, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

const TooltipStyle = {
  contentStyle: {
    background: "#161f30", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 8, fontSize: 12, color: "#e2e8f0",
  },
};

export default function RateLimiting({ rateLimits, metrics, timeSeries }) {
  const { quotas = [], rateLimitEvents = 0 } = rateLimits || {};

  // Build 429 events chart from time series
  const rlChart = timeSeries.map((b) => ({
    t:   fmtTime(b.timestamp),
    rl:  b.rateLimit || 0,
    req: b.requests  || 0,
  }));

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title"><Shield size={18} /> Rate Limiting</h2>
      </div>

      <div className="rl-grid">
        {/* ─ Quota bars ─ */}
        <div className="card">
          <div className="card-title"><Shield size={13} /> Active Quotas (Redis)</div>

          {quotas.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <Shield size={28} style={{ opacity: 0.25, marginBottom: 8 }} />
              <div>No active keys in Redis window.</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Make requests to see quota usage.</div>
            </div>
          ) : (
            quotas.map((q) => {
              const pct = Math.min((q.used / q.max) * 100, 100);
              const isWarn = pct >= 80;
              const isOver = q.used >= q.max;
              return (
                <div key={q.key} className="quota-item">
                  <div className="quota-header">
                    <span className="quota-key" title={q.key}>{q.key}</span>
                    <span className="quota-count" style={{ color: isOver ? "var(--red)" : isWarn ? "var(--amber)" : "var(--text-2)" }}>
                      {q.used} / {q.max}
                    </span>
                  </div>
                  <div className="quota-bar">
                    <div
                      className={`quota-fill ${isOver ? "over" : isWarn ? "warn" : ""}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="quota-ttl">Resets in {q.ttl}s</div>
                </div>
              );
            })
          )}
        </div>

        {/* ─ 429 counter ─ */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card-title"><AlertTriangle size={13} /> Rate Limit Events</div>

          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div className="rl-stat-val">{rateLimitEvents}</div>
            <div className="rl-stat-label">Total HTTP 429 responses</div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              429s per second (last 60s)
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={rlChart} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="t" stroke="#334155" tick={{ fill: "#64748b", fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis stroke="#334155" tick={{ fill: "#64748b", fontSize: 9 }} allowDecimals={false} />
                <Tooltip {...TooltipStyle} formatter={(v) => [v, "429s"]} />
                <Bar dataKey="rl" name="Rate Limited" fill="#f43f5e" radius={[2, 2, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
