import { useState, useEffect } from "react";
import { useGatewayData }  from "./hooks/useGatewayData";
import Sidebar             from "./components/Sidebar";
import TopBar              from "./components/TopBar";
import Overview            from "./components/Overview";
import LiveTraffic         from "./components/LiveTraffic";
import RequestLogs         from "./components/RequestLogs";
import ServiceHealth       from "./components/ServiceHealth";
import RateLimiting        from "./components/RateLimiting";
import ApiPlayground       from "./components/ApiPlayground";

const SECTIONS = ["overview","traffic","logs","health","rate-limits","playground"];

export default function App() {
  const data = useGatewayData();
  const [active, setActive] = useState("overview");

  // Highlight active nav item based on scroll position
  useEffect(() => {
    const handler = () => {
      for (const id of [...SECTIONS].reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) { setActive(id); break; }
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="app">
      <Sidebar active={active} onNavigate={setActive} data={data} />

      <div className="main">
        <TopBar connected={data.connected} metrics={data.metrics} />

        <div className="content">
          <section id="overview">
            <Overview metrics={data.metrics} />
          </section>

          <section id="traffic">
            <LiveTraffic timeSeries={data.timeSeries} logs={data.logs} />
          </section>

          <section id="logs">
            <RequestLogs logs={data.logs} />
          </section>

          <section id="health">
            <ServiceHealth services={data.services} />
          </section>

          <section id="rate-limits">
            <RateLimiting rateLimits={data.rateLimits} metrics={data.metrics} timeSeries={data.timeSeries} />
          </section>

          <section id="playground">
            <ApiPlayground />
          </section>
        </div>
      </div>
    </div>
  );
}
