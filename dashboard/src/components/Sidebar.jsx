import { Activity, BarChart2, ScrollText, Heart, Shield, Terminal, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const NAV = [
  { id: "overview",    label: "Overview",       Icon: Activity   },
  { id: "traffic",     label: "Traffic",        Icon: BarChart2  },
  { id: "logs",        label: "Request Logs",   Icon: ScrollText },
  { id: "health",      label: "Service Health", Icon: Heart      },
  { id: "rate-limits", label: "Rate Limits",    Icon: Shield     },
  { id: "playground",  label: "API Explorer",   Icon: Terminal   },
];

export default function Sidebar({ active, onNavigate, data, collapsed, onToggle }) {
  const errorCount = data?.metrics?.failedRequests || 0;

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14 4.5v7L8 15 2 11.5v-7L8 1z" fill="white" fillOpacity="0.9" />
            <path d="M8 5L11 6.75v3.5L8 12 5 10.25v-3.5L8 5z" fill="white" fillOpacity="0.4" />
          </svg>
        </div>
        {!collapsed && (
          <div>
            <div className="sidebar-logo-text">PulseGate</div>
            <div className="sidebar-logo-sub">Observability</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            title={collapsed ? label : undefined}
            className={`nav-item ${active === id ? "active" : ""}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={15} className="nav-icon" />
            {!collapsed && <span className="nav-label">{label}</span>}
            {!collapsed && id === "logs" && errorCount > 0 && (
              <span className="nav-badge">{errorCount > 99 ? "99+" : errorCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer: collapse toggle + connection status */}
      <div className="sidebar-toggle">
        <button onClick={onToggle} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed
            ? <PanelLeftOpen size={15} />
            : <PanelLeftClose size={15} />}
        </button>
        {!collapsed && (
          <div className="connection-status">
            <div className={`conn-dot ${data?.connected ? "live" : "dead"}`} />
            <span>{data?.connected ? "Connected" : "Reconnecting…"}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
