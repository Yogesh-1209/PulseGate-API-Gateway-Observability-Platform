import { Activity, CheckCircle, XCircle, Clock, Zap, Shield } from "lucide-react";

const CARDS = [
  {
    key: "totalRequests",
    label: "Total Requests",
    Icon: Activity,
    color: "var(--accent)",
    format: (v) => v.toLocaleString(),
    sub: (m) => `Since gateway start`,
  },
  {
    key: "successRate",
    label: "Success Rate",
    Icon: CheckCircle,
    color: "var(--green)",
    format: (v) => `${v}%`,
    sub: (m) => `${m.successRequests.toLocaleString()} successful`,
  },
  {
    key: "failedRequests",
    label: "Failed Requests",
    Icon: XCircle,
    color: "var(--red)",
    format: (v) => v.toLocaleString(),
    sub: (m) => `4xx + 5xx responses`,
  },
  {
    key: "avgResponseTime",
    label: "Avg Response Time",
    Icon: Clock,
    color: "var(--cyan)",
    format: (v) => `${v}ms`,
    sub: (m) => {
      const rt = m.avgResponseTime;
      return rt < 100 ? "Excellent" : rt < 300 ? "Good" : rt < 1000 ? "Slow" : "Very slow";
    },
  },
  {
    key: "requestsPerSecond",
    label: "Requests / sec",
    Icon: Zap,
    color: "var(--amber)",
    format: (v) => v.toFixed(2),
    sub: (m) => `Lifetime average`,
  },
  {
    key: "rateLimitEvents",
    label: "Rate Limited",
    Icon: Shield,
    color: "var(--red)",
    format: (v) => v.toLocaleString(),
    sub: (m) => `HTTP 429 responses`,
  },
];

export default function Overview({ metrics }) {
  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">
          <Activity size={18} /> Overview
        </h2>
      </div>

      <div className="stat-grid">
        {CARDS.map(({ key, label, Icon, color, format, sub }) => {
          const val = metrics?.[key] ?? 0;
          return (
            <div
              key={key}
              className="stat-card fade-in"
              style={{ "--accent-color": color }}
            >
              <Icon size={18} color={color} style={{ marginBottom: 12 }} />
              <div className="stat-value">{format(val)}</div>
              <div className="stat-label">{label}</div>
              <div className="stat-sub">{sub(metrics || {})}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
