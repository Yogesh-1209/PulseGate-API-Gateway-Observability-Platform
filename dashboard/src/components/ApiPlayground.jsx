import { useState } from "react";
import { Terminal, Send, RotateCcw } from "lucide-react";

const ENDPOINTS = [
  { method: "GET",  path: "/api/users",                       body: null },
  { method: "GET",  path: "/api/users/1",                     body: null },
  { method: "GET",  path: "/api/users/2",                     body: null },
  { method: "GET",  path: "/api/products",                    body: null },
  { method: "GET",  path: "/api/products/1",                  body: null },
  { method: "GET",  path: "/api/products?category=electronics",body: null },
  { method: "GET",  path: "/api/products?category=furniture",  body: null },
  { method: "POST", path: "/api/users",    body: '{\n  "name": "Test User",\n  "email": "test@example.com",\n  "role": "user"\n}' },
  { method: "POST", path: "/api/products", body: '{\n  "name": "Test Product",\n  "category": "electronics",\n  "price": 49.99,\n  "stock": 50\n}' },
  { method: "GET",  path: "/health",                          body: null },
];

function syntaxHighlight(json) {
  if (typeof json !== "string") return json;
  return json
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = "json-number";
        if (/^"/.test(match)) cls = /:$/.test(match) ? "json-key" : "json-string";
        else if (/true|false/.test(match)) cls = "json-bool";
        else if (/null/.test(match)) cls = "json-null";
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

export default function ApiPlayground() {
  const [method,   setMethod]   = useState("GET");
  const [path,     setPath]     = useState("/api/users");
  const [apiKey,   setApiKey]   = useState("key-client-abc-123");
  const [body,     setBody]     = useState("");
  const [response, setResponse] = useState(null);
  const [loading,  setLoading]  = useState(false);

  const selectEndpoint = (e) => {
    const ep = ENDPOINTS[parseInt(e.target.value)];
    if (!ep) return;
    setMethod(ep.method);
    setPath(ep.path);
    setBody(ep.body || "");
  };

  const send = async () => {
    setLoading(true);
    setResponse(null);
    const t0 = Date.now();

    try {
      const opts = {
        method,
        headers: {
          "x-api-key": apiKey,
          ...(method !== "GET" && { "Content-Type": "application/json" }),
        },
        ...(method !== "GET" && body.trim() && { body: body.trim() }),
      };

      const res = await fetch(path, opts);
      const duration = Date.now() - t0;

      let text;
      try {
        const json = await res.json();
        text = JSON.stringify(json, null, 2);
      } catch {
        text = await res.text();
      }

      const hdrs = {};
      res.headers.forEach((v, k) => { hdrs[k] = v; });

      setResponse({ status: res.status, statusText: res.statusText, duration, body: text, headers: hdrs });
    } catch (err) {
      setResponse({ status: 0, statusText: "Network Error", duration: Date.now() - t0, body: err.message, headers: {} });
    } finally {
      setLoading(false);
    }
  };

  function statusClass(s) {
    if (!s) return "status-5";
    if (s >= 500) return "status-5";
    if (s >= 400) return "status-4";
    if (s >= 300) return "status-3";
    if (s >= 200) return "status-2";
    return "status-1";
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title"><Terminal size={18} /> API Playground</h2>
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>Send real requests through the gateway</span>
      </div>

      <div className="playground-grid">
        {/* ─ Request builder ─ */}
        <div className="card">
          <div className="card-title"><Terminal size={13} /> Request</div>
          <div className="pg-form">
            {/* Quick-pick endpoint */}
            <div>
              <div className="pg-label">Quick select</div>
              <select className="pg-select" onChange={selectEndpoint} defaultValue="">
                <option value="" disabled>— pick an endpoint —</option>
                {ENDPOINTS.map((ep, i) => (
                  <option key={i} value={i}>{ep.method} {ep.path}</option>
                ))}
              </select>
            </div>

            {/* Method + Path */}
            <div>
              <div className="pg-label">Method + Path</div>
              <div className="pg-row">
                <select
                  className="pg-select pg-method-select"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  {["GET","POST","PUT","PATCH","DELETE"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <input
                  className="pg-input"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/api/users"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* API Key */}
            <div>
              <div className="pg-label">API Key (x-api-key header)</div>
              <input
                className="pg-input mono"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="key-client-abc-123"
                spellCheck={false}
              />
            </div>

            {/* Body (POST/PUT/PATCH) */}
            {["POST","PUT","PATCH"].includes(method) && (
              <div>
                <div className="pg-label">Request Body (JSON)</div>
                <textarea
                  className="pg-input pg-textarea mono"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{ "key": "value" }'
                />
              </div>
            )}

            {/* Send */}
            <button className="btn-send" onClick={send} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Send size={14} />}
              {loading ? "Sending…" : "Send Request"}
            </button>
          </div>
        </div>

        {/* ─ Response ─ */}
        <div className="pg-response">
          <div className="pg-response-header">
            <div className="card-title" style={{ margin: 0 }}>
              <Terminal size={13} /> Response
            </div>
            {response && (
              <button
                onClick={() => setResponse(null)}
                style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
              >
                <RotateCcw size={12} /> Clear
              </button>
            )}
          </div>

          {!response && !loading && (
            <div className="empty-state" style={{ flex: 1 }}>
              <Terminal size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
              <div>Hit "Send Request" to see the response here.</div>
            </div>
          )}

          {loading && (
            <div className="empty-state" style={{ flex: 1 }}>
              <span className="spinner" />
              <div style={{ marginTop: 12 }}>Waiting for response…</div>
            </div>
          )}

          {response && !loading && (
            <>
              <div className="pg-status-row">
                <span className={`badge ${statusClass(response.status)}`} style={{ fontSize: 13, padding: "3px 10px" }}>
                  {response.status || "ERR"} {response.statusText}
                </span>
                <span className="pg-timing">{response.duration}ms</span>
              </div>

              {/* Interesting headers */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["x-ratelimit-limit","x-ratelimit-remaining","x-ratelimit-reset","content-type"].map((h) =>
                  response.headers[h] ? (
                    <span key={h} style={{ fontSize: 10, padding: "2px 8px", background: "var(--accent-dim)", color: "var(--accent)", borderRadius: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                      {h}: {response.headers[h]}
                    </span>
                  ) : null
                )}
              </div>

              <div
                className="pg-response-body"
                dangerouslySetInnerHTML={{ __html: syntaxHighlight(response.body) }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
