import { Heart, Server, Database, Users, Package } from "lucide-react";

const SERVICE_META = {
  gateway:         { label: "API Gateway",      Icon: Server,   sub: "Node.js · Port 3000" },
  redis:           { label: "Redis",            Icon: Database, sub: "Rate limit store"     },
  usersService:    { label: "Users Service",    Icon: Users,    sub: "Node.js · Port 3001"  },
  productsService: { label: "Products Service", Icon: Package,  sub: "Node.js · Port 3002"  },
};

function StatusPill({ status }) {
  const label = status === "healthy" ? "Healthy"
              : status === "down"    ? "Down"
              : status === "degraded" ? "Degraded"
              : status === "timeout"  ? "Timeout"
              : "Unknown";
  return (
    <div className={`status-pill ${status || "unknown"}`}>
      <div className="status-pill-dot" />
      {label}
    </div>
  );
}

function fmtRT(rt) {
  if (rt === null || rt === undefined) return "—";
  return `${rt}ms`;
}

function fmtChecked(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `Checked at ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

export default function ServiceHealth({ services }) {
  const entries = Object.entries(services || {}).filter(([k]) => k !== "checkedAt");

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title"><Heart size={18} /> Service Health</h2>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>
          {services?.checkedAt ? fmtChecked(services.checkedAt) : "Waiting for first check…"}
        </span>
      </div>

      <div className="health-grid">
        {entries.map(([key, svc]) => {
          const meta = SERVICE_META[key] || { label: svc.name, Icon: Server, sub: "" };
          const { Icon } = meta;
          const status = svc.status || "unknown";

          return (
            <div key={key} className={`health-card ${status}`}>
              <div className="health-card-header">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Icon size={16} color="var(--accent)" />
                    <span className="health-service-name">{meta.label}</span>
                  </div>
                  <div className="health-service-sub">{meta.sub}</div>
                </div>
                <StatusPill status={status} />
              </div>

              <div className="health-rt">{fmtRT(svc.responseTime)}</div>
              <div className="health-rt-label">Response time</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
