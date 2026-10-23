import { useState, useRef, useEffect } from "react";
import { ScrollText, Filter } from "lucide-react";

function statusClass(s) {
  if (s >= 500) return "status-5";
  if (s >= 400) return "status-4";
  if (s >= 300) return "status-3";
  if (s >= 200) return "status-2";
  return "status-1";
}

function fmtTs(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

function durationColor(ms) {
  if (ms < 100)  return "var(--green)";
  if (ms < 500)  return "var(--amber)";
  return "var(--red)";
}

export default function RequestLogs({ logs }) {
  const [filter, setFilter] = useState("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const wrapRef = useRef(null);
  const prevIdsRef = useRef(new Set());

  // Track new rows for flash animation
  const newIds = new Set();
  logs.forEach((l) => { if (!prevIdsRef.current.has(l.id)) newIds.add(l.id); });
  useEffect(() => { prevIdsRef.current = new Set(logs.map((l) => l.id)); }, [logs]);

  const filtered = logs.filter((l) => {
    if (filter === "all")     return true;
    if (filter === "success") return l.status < 400;
    if (filter === "errors")  return l.status >= 400;
    if (filter === "slow")    return l.duration > 500;
    return true;
  });

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title"><ScrollText size={18} /> Request Logs</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>
            {filtered.length} / {logs.length} entries
          </span>
          <select
            className="pg-select"
            style={{ width: "auto", padding: "5px 10px", fontSize: 12 }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="errors">Errors</option>
            <option value="slow">Slow (&gt;500ms)</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-3)", cursor: "pointer" }}>
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
            Auto-scroll
          </label>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div ref={wrapRef} className="logs-table-wrap">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <ScrollText size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
              <div>No requests yet — make some API calls to see logs here.</div>
            </div>
          ) : (
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Upstream</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className={newIds.has(log.id) ? "new-row" : ""}>
                    <td><span className="ts">{fmtTs(log.timestamp)}</span></td>
                    <td><span className={`badge method-${log.method}`}>{log.method}</span></td>
                    <td><span className="path-cell" title={log.path}>{log.path}</span></td>
                    <td><span className={`badge ${statusClass(log.status)}`}>{log.status}</span></td>
                    <td>
                      <span className="duration" style={{ color: durationColor(log.duration) }}>
                        {log.duration}ms
                      </span>
                    </td>
                    <td><span className="upstream">{log.upstream}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
