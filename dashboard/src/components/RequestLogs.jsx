/**
 * RequestLogs — live request table.
 * Receives real logs from SSE via the useGatewayData hook.
 * Rows animate in when new (flash effect) and filter buttons work client-side.
 */

import { useState, useRef, useEffect } from "react";
import { ScrollText } from "lucide-react";

function statusClass(s) {
  if (s >= 500) return "status-5xx";
  if (s >= 400) return "status-4xx";
  if (s >= 300) return "status-3xx";
  return "status-2xx";
}

function fmtTs(iso) {
  const d = new Date(iso);
  return (
    `${String(d.getHours()).padStart(2,"0")}:` +
    `${String(d.getMinutes()).padStart(2,"0")}:` +
    `${String(d.getSeconds()).padStart(2,"0")}`
  );
}

function durColor(ms) {
  if (ms < 100)  return "var(--green)";
  if (ms < 500)  return "var(--amber)";
  return "var(--red)";
}

const FILTERS = [
  { id: "all",     label: "All" },
  { id: "success", label: "2xx" },
  { id: "errors",  label: "Errors" },
  { id: "slow",    label: "> 500ms" },
];

export default function RequestLogs({ logs }) {
  const [filter, setFilter] = useState("all");
  const prevIdsRef = useRef(new Set());

  // track which IDs are new this render
  const newIds = new Set();
  (logs || []).forEach((l) => {
    if (!prevIdsRef.current.has(l.id)) newIds.add(l.id);
  });
  useEffect(() => {
    prevIdsRef.current = new Set((logs || []).map((l) => l.id));
  }, [logs]);

  const filtered = (logs || []).filter((l) => {
    if (filter === "success") return l.status >= 200 && l.status < 300;
    if (filter === "errors")  return l.status >= 400;
    if (filter === "slow")    return l.duration > 500;
    return true;
  });

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <ScrollText size={13} />
          Request Logs
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="section-sub">{filtered.length} / {(logs || []).length}</span>
          <div className="filter-bar">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`filter-btn ${filter === f.id ? "active" : ""}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <ScrollText size={28} opacity={0.2} />
            <span>
              {(logs || []).length === 0
                ? "No requests yet — make API calls to see logs here."
                : "No entries match the current filter."}
            </span>
          </div>
        ) : (
          <div className="logs-wrap">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>Upstream</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr
                    key={log.id}
                    className={newIds.has(log.id) ? "row-new" : ""}
                  >
                    <td><span className="ts-cell">{fmtTs(log.timestamp)}</span></td>
                    <td>
                      <span className={`badge method-${log.method}`}>
                        {log.method}
                      </span>
                    </td>
                    <td>
                      <span className="path-cell" title={log.path}>
                        {log.path}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${statusClass(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td>
                      <span
                        className="dur-cell"
                        style={{ color: durColor(log.duration) }}
                      >
                        {log.duration}ms
                      </span>
                    </td>
                    <td>
                      <span className="upstream-cell">{log.upstream || "gateway"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
