/**
 * ServiceHealth — live health checks for gateway, Redis, users, products.
 * Health data comes from SSE: the backend polls every 10 seconds.
 * "Unknown" is the honest initial state before the first check arrives.
 */

import { Server, Database, Users, Package } from "lucide-react";

const META = {
  gateway:         { label: "API Gateway",      sub: "Express · port 3000", Icon: Server   },
  redis:           { label: "Redis",            sub: "Rate limit store",    Icon: Database  },
  usersService:    { label: "Users Service",    sub: "Express · port 3001", Icon: Users    },
  productsService: { label: "Products Service", sub: "Express · port 3002", Icon: Package  },
};

function StatusPill({ status }) {
  const labels = {
    healthy:  "Healthy",
    down:     "Down",
    degraded: "Degraded",
    timeout:  "Timeout",
    unknown:  "Unknown",
  };
  return (
    <div className={`status-pill ${status || "unknown"}`}>
      <div className="status-pill-dot" />
      {labels[status] || "Unknown"}
    </div>
  );
}

function fmtChecked(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

export default function ServiceHealth({ services }) {
  const entries = Object.entries(services || {}).filter(([k]) => k !== "checkedAt");
  const checkedAt = services?.checkedAt;

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Service Health
        </div>
        <span className="section-sub">
          {checkedAt
            ? `Last checked ${fmtChecked(checkedAt)} · updates every 10s`
            : "Waiting for first health check…"}
        </span>
      </div>

      <div className="health-grid">
        {entries.map(([key, svc]) => {
          const meta   = META[key] || { label: svc?.name || key, sub: "", Icon: Server };
          const { Icon } = meta;
          const status = svc?.status || "unknown";
          const rt     = svc?.responseTime;

          return (
            <div key={key} className={`health-card ${status}`}>
              <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon size={14} color="var(--text-3)" />
                <div>
                  <div className="health-name">{meta.label}</div>
                  <div className="health-sub">{meta.sub}</div>
                </div>
              </div>

              <div className="health-row">
                <div>
                  <div className="health-rt">
                    {rt != null ? `${rt}ms` : "—"}
                  </div>
                  <div className="health-rt-label">Response time</div>
                </div>
                <StatusPill status={status} />
              </div>
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
            Connecting to gateway…
          </div>
        )}
      </div>
    </div>
  );
}
