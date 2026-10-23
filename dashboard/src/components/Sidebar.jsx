import { Activity, BarChart2, ScrollText, Heart, Shield, Terminal, Zap } from "lucide-react";

const NAV = [
  { id: "overview",    label: "Overview",      Icon: Activity    },
  { id: "traffic",     label: "Live Traffic",  Icon: BarChart2   },
  { id: "logs",        label: "Request Logs",  Icon: ScrollText  },
  { id: "health",      label: "Service Health",Icon: Heart       },
  { id: "rate-limits", label: "Rate Limiting", Icon: Shield      },
  { id: "playground",  label: "API Playground",Icon: Terminal    },
];

export default function Sidebar({ active, onNavigate, data }) {
  const failedCount = data?.metrics?.failedRequests || 0;

  const scrollTo = (id) => {
    onNavigate(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={16} color="#fff" />
        </div>
        <div>
          <div className="sidebar-logo-text">API Gateway</div>
          <div className="sidebar-logo-sub">Dashboard v1.0</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-item ${active === id ? "active" : ""}`}
            onClick={() => scrollTo(id)}
          >
            <Icon size={16} />
            <span className="nav-label">{label}</span>
            {id === "logs" && failedCount > 0 && (
              <span className="nav-badge">{failedCount > 99 ? "99+" : failedCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer — gateway status */}
      <div className="sidebar-footer">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8, height: 8, borderRadius: "50%",
              background: data?.connected ? "var(--green)" : "var(--red)",
              boxShadow: data?.connected ? "0 0 6px var(--green)" : "none",
              animation: data?.connected ? "pulse-dot 2s infinite" : "none",
            }}
          />
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            {data?.connected ? "Connected" : "Reconnecting…"}
          </span>
        </div>
      </div>
    </aside>
  );
}
