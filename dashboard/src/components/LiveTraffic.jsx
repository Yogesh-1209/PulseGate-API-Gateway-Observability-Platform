import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { BarChart2, Clock } from "lucide-react";

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

const TooltipStyle = {
  contentStyle: {
    background: "#161f30",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 8,
    fontSize: 12,
    color: "#e2e8f0",
  },
  labelStyle: { color: "#94a3b8", marginBottom: 4 },
  itemStyle: { color: "#e2e8f0" },
};

/* Count status codes from recent logs */
function buildStatusDist(logs) {
  const counts = { "2xx": 0, "4xx": 0, "5xx": 0, "other": 0 };
  logs.forEach(({ status }) => {
    if (status >= 200 && status < 300) counts["2xx"]++;
    else if (status >= 400 && status < 500) counts["4xx"]++;
    else if (status >= 500) counts["5xx"]++;
    else counts["other"]++;
  });
  return counts;
}

export default function LiveTraffic({ timeSeries, logs }) {
  const chartData = timeSeries.map((b) => ({
    t:    fmtTime(b.timestamp),
    req:  b.requests,
    ok:   b.success,
    fail: b.failed,
    rt:   b.avgDuration,
  }));

  const dist = buildStatusDist(logs);

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title"><BarChart2 size={18} /> Live Traffic</h2>
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>Last 60 seconds</span>
      </div>

      <div className="chart-grid">
        {/* ─ Request Volume ─ */}
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title"><BarChart2 size={14} /> Request Volume</span>
            <div className="chart-legend">
              <div className="legend-item"><div className="legend-dot" style={{ background: "#10b981" }} /> Success</div>
              <div className="legend-item"><div className="legend-dot" style={{ background: "#f43f5e" }} /> Failed</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gOk"   x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gFail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="t" stroke="#334155" tick={{ fill: "#64748b", fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis stroke="#334155" tick={{ fill: "#64748b", fontSize: 10 }} allowDecimals={false} />
              <Tooltip {...TooltipStyle} />
              <Area type="monotone" dataKey="ok"   name="Success" stroke="#10b981" fill="url(#gOk)"   strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="fail" name="Failed"  stroke="#f43f5e" fill="url(#gFail)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ─ Response Time ─ */}
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title"><Clock size={14} /> Avg Response Time (ms)</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gRt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="t" stroke="#334155" tick={{ fill: "#64748b", fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis stroke="#334155" tick={{ fill: "#64748b", fontSize: 10 }} unit="ms" />
              <Tooltip {...TooltipStyle} formatter={(v) => [`${v}ms`, "Avg RT"]} />
              <Line type="monotone" dataKey="rt" name="Response Time" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#8b5cf6" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ─ Status Code Distribution ─ */}
        <div className="chart-card" style={{ gridColumn: "1 / -1" }}>
          <div className="chart-header">
            <span className="chart-title">Status Code Distribution (last {logs.length} requests)</span>
            <div className="chart-legend">
              <div className="legend-item"><div className="legend-dot" style={{ background: "#10b981" }} /> 2xx</div>
              <div className="legend-item"><div className="legend-dot" style={{ background: "#f59e0b" }} /> 4xx</div>
              <div className="legend-item"><div className="legend-dot" style={{ background: "#f43f5e" }} /> 5xx</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, alignItems: "center", padding: "8px 0" }}>
            {[
              { label: "2xx Success", val: dist["2xx"], color: "#10b981" },
              { label: "4xx Client",  val: dist["4xx"], color: "#f59e0b" },
              { label: "5xx Server",  val: dist["5xx"], color: "#f43f5e" },
              { label: "Other",       val: dist["other"], color: "#64748b" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{label}</div>
                <div style={{
                  marginTop: 8, height: 4, borderRadius: 99,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 99, background: color,
                    width: logs.length > 0 ? `${(val / logs.length) * 100}%` : "0%",
                    transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
