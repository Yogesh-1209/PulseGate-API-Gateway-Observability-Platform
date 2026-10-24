import { useState } from "react";
import { useGatewayData } from "./hooks/useGatewayData";
import Sidebar     from "./components/Sidebar";
import TopBar      from "./components/TopBar";
import Overview    from "./components/Overview";
import LiveTraffic from "./components/LiveTraffic";
import RequestLogs from "./components/RequestLogs";
import ServiceHealth from "./components/ServiceHealth";
import RateLimiting  from "./components/RateLimiting";
import ApiPlayground from "./components/ApiPlayground";

export default function App() {
  const data = useGatewayData();
  const [active, setActive]       = useState("overview");
  const [collapsed, setCollapsed] = useState(false);

  const scrollTo = (id) => {
    setActive(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="app">
      <Sidebar
        active={active}
        onNavigate={scrollTo}
        data={data}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />

      <div className={`main ${collapsed ? "collapsed" : ""}`}>
        <TopBar connected={data.connected} metrics={data.metrics} />

        <div className="content">
          <section id="overview">
            <Overview metrics={data.metrics} />
          </section>

          <section id="traffic">
            <LiveTraffic timeSeries={data.timeSeries} />
          </section>

          <section id="logs">
            <RequestLogs logs={data.logs} />
          </section>

          <section id="health">
            <ServiceHealth services={data.services} />
          </section>

          <section id="rate-limits">
            <RateLimiting
              rateLimits={data.rateLimits}
              timeSeries={data.timeSeries}
            />
          </section>

          <section id="playground">
            <ApiPlayground />
          </section>
        </div>
      </div>
    </div>
  );
}
