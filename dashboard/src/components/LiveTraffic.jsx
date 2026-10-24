/**
 * LiveTraffic — request volume + avg latency time-series charts.
 * Both charts use data from the in-memory metrics store via SSE.
 * No fabricated data — empty states shown when the series is empty.
 */

import {
  AreaChart, Area,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { BarChart2, Clock } from "lucide-react";

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

const TT_STYLE = {
  contentStyle: {
    background: "#131929",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 6,
    fontSize: 11,
    color: "#d1d9e6",
    padding: "7px 11px",
  },
  labelStyle: { color: "#7d8fa8", marginBottom: 3 },
  itemStyle:  { color: "#d1d9e6", padding: 0 },
};

const AXIS_PROPS = {
  stroke: "transparent",
  tick: { fill: "#4a5568", fontSize: 10 },
};

const GRID_PROPS = {
  strokeDasharray: "3 3",
  stroke: "rgba(255,255,255,0.04)",
};

function EmptyChart({ height = 160 }) {
  return (
    <div className="chart-empty" style={{ height }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity={0.3}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
      <span>No data yet — make requests to see charts update</span>
    </div>
  );
}

export default function LiveTraffic({ timeSeries }) {
  const chartData = (timeSeries || []).map((b) => ({
    t:    fmtTime(b.timestamp),
    ok:   b.success   || 0,
    fail: b.failed    || 0,
    req:  b.requests  || 0,
    rt:   b.avgDuration || 0,
  }));

  const hasData = chartData.some((d) => d.req > 0);

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <BarChart2 size={13} />
          Traffic — Last 60s
        </div>
        <span className="section-sub">1-second buckets · live via SSE</span>
      </div>

      <div className="chart-grid">
        {/* Request Volume */}
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">
              <BarChart2 size={12} />
              Request Volume
            </span>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: "#34d399" }} />
                Success
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: "#f87171" }} />
                Failed
              </div>
            </div>
          </div>

          {!hasData ? (
            <EmptyChart height={160} />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 2, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="gOk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#34d399" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gFail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f87171" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="t" {...AXIS_PROPS} interval="preserveStartEnd" />
                <YAxis {...AXIS_PROPS} allowDecimals={false} width={28} />
                <Tooltip {...TT_STYLE} formatter={(v, n) => [v, n]} />
                <Area
                  type="monotone" dataKey="ok" name="Success"
                  stroke="#34d399" fill="url(#gOk)" strokeWidth={1.5} dot={false}
                />
                <Area
                  type="monotone" dataKey="fail" name="Failed"
                  stroke="#f87171" fill="url(#gFail)" strokeWidth={1.5} dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Response Time */}
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">
              <Clock size={12} />
              Avg Response Time
            </span>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: "#a78bfa" }} />
                ms
              </div>
            </div>
          </div>

          {!hasData ? (
            <EmptyChart height={160} />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 2, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="t" {...AXIS_PROPS} interval="preserveStartEnd" />
                <YAxis {...AXIS_PROPS} unit="ms" width={36} />
                <Tooltip
                  {...TT_STYLE}
                  formatter={(v) => [`${v}ms`, "Avg latency"]}
                />
                <Line
                  type="monotone" dataKey="rt" name="Response Time"
                  stroke="#a78bfa" strokeWidth={1.5} dot={false}
                  activeDot={{ r: 3, fill: "#a78bfa", strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
