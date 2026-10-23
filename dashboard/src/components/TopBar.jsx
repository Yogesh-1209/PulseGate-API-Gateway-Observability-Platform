function fmt(ms) {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export default function TopBar({ connected, metrics }) {
  return (
    <header className="topbar">
      <div>
        <span className="topbar-title">Gateway Monitor</span>
        <span style={{ marginLeft: 12, fontSize: 12, color: "var(--text-3)" }}>
          Uptime: {fmt(metrics?.uptime || 0)}
        </span>
      </div>

      <div className="topbar-right">
        <span className="topbar-rps">
          <span>{(metrics?.requestsPerSecond || 0).toFixed(2)}</span> req/s
        </span>

        <div className={`live-badge ${connected ? "" : "offline-badge"}`}>
          <div className="live-dot" />
          {connected ? "LIVE" : "OFFLINE"}
        </div>
      </div>
    </header>
  );
}
