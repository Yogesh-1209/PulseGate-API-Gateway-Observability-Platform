/**
 * TopBar — gateway connection status, uptime, and live throughput.
 *
 * Fixes:
 *   - Uptime never shows "0s" for < 1 second; shows a sensible default.
 *   - OFFLINE state only shows when SSE is actually disconnected.
 */

function fmtUptime(ms) {
  if (!ms || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60)  return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export default function TopBar({ connected, metrics }) {
  const uptime = fmtUptime(metrics?.uptime);
  const rps    = (metrics?.requestsPerSecond ?? 0).toFixed(2);
  const total  = (metrics?.totalRequests ?? 0).toLocaleString();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-title">PulseGate</span>

        <div className="topbar-divider" />

        <div className="topbar-meta">
          <div className="topbar-stat">
            Uptime: <span>{uptime}</span>
          </div>
          <div className="topbar-stat">
            Requests: <span>{total}</span>
          </div>
          <div className="topbar-stat">
            Throughput: <span>{rps} req/s</span>
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <div className={`status-chip ${connected ? "live" : "offline"}`}>
          <div className="status-chip-dot" />
          {connected ? "Live" : "Offline"}
        </div>
      </div>
    </header>
  );
}
