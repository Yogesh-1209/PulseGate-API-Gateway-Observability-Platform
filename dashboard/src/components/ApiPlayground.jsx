/**
 * ApiPlayground (API Explorer) — sends real requests through the gateway.
 *
 * Security note: The API key lives in component state only (user-entered).
 * The Vite dev proxy and nginx production config ensure the browser never
 * directly hits the gateway — the key is only sent as a request header,
 * never embedded in source code or env files.
 */

import { useState } from "react";
import { Terminal, Send, RotateCcw, ChevronDown } from "lucide-react";

const ENDPOINTS = [
  { method: "GET",  path: "/api/users",                        body: null },
  { method: "GET",  path: "/api/users/1",                      body: null },
  { method: "GET",  path: "/api/users/2",                      body: null },
  { method: "GET",  path: "/api/products",                     body: null },
  { method: "GET",  path: "/api/products/1",                   body: null },
  { method: "GET",  path: "/api/products?category=electronics",body: null },
  { method: "GET",  path: "/api/products?category=furniture",  body: null },
  { method: "POST", path: "/api/users",
    body: '{\n  "name": "Test User",\n  "email": "test@example.com",\n  "role": "user"\n}' },
  { method: "POST", path: "/api/products",
    body: '{\n  "name": "Test Product",\n  "category": "electronics",\n  "price": 49.99,\n  "stock": 50\n}' },
  { method: "GET",  path: "/health",                           body: null },
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

function statusClass(s) {
  if (!s)     return "status-5xx";
  if (s >= 500) return "status-5xx";
  if (s >= 400) return "status-4xx";
  if (s >= 300) return "status-3xx";
  return "status-2xx";
}

const INTERESTING_HEADERS = [
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
  "content-type",
  "x-forwarded-for",
];

export default function ApiPlayground() {
  const [method,   setMethod]   = useState("GET");
  const [path,     setPath]     = useState("/api/users");
  const [apiKey,   setApiKey]   = useState("key-client-abc-123");
  const [body,     setBody]     = useState("");
  const [response, setResponse] = useState(null);
  const [loading,  setLoading]  = useState(false);

  const selectPreset = (e) => {
    const ep = ENDPOINTS[parseInt(e.target.value, 10)];
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
      setResponse({
        status: 0,
        statusText: "Network Error",
        duration: Date.now() - t0,
        body: err.message,
        headers: {},
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
  };

  const methodHasBody = ["POST", "PUT", "PATCH"].includes(method);

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <Terminal size={13} />
          API Explorer
        </div>
        <span className="section-sub">Cmd/Ctrl+Enter to send · responses appear in the gateway logs</span>
      </div>

      <div className="playground-grid">
        {/* ─ Request builder ─ */}
        <div className="card">
          <div className="card-label">
            <Terminal size={11} />
            Request
          </div>

          <div className="pg-form">
            {/* Preset picker */}
            <div>
              <div className="pg-label">Preset endpoint</div>
              <div style={{ position: "relative" }}>
                <select className="pg-select" onChange={selectPreset} defaultValue="">
                  <option value="" disabled>Select a preset…</option>
                  {ENDPOINTS.map((ep, i) => (
                    <option key={i} value={i}>
                      {ep.method.padEnd(6)} {ep.path}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-3)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>

            {/* Method + Path */}
            <div>
              <div className="pg-label">Method · Path</div>
              <div className="pg-row">
                <div style={{ position: "relative" }}>
                  <select
                    className="pg-select pg-method-select"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <input
                  className="pg-input mono"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="/api/users"
                  spellCheck={false}
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
                />
              </div>
            </div>

            {/* API Key */}
            <div>
              <div className="pg-label">API Key (x-api-key)</div>
              <input
                className="pg-input"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="key-client-abc-123"
                spellCheck={false}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
              />
            </div>

            {/* Body */}
            {methodHasBody && (
              <div>
                <div className="pg-label">Request Body (JSON)</div>
                <textarea
                  className="pg-input pg-textarea"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{ "key": "value" }'
                />
              </div>
            )}

            <button className="btn-send" onClick={send} disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ width: 13, height: 13 }} /> Sending…</>
                : <><Send size={13} /> Send Request</>}
            </button>
          </div>
        </div>

        {/* ─ Response pane ─ */}
        <div className="pg-response-pane">
          <div className="pg-resp-header">
            <div className="card-label" style={{ margin: 0 }}>
              <Terminal size={11} />
              Response
            </div>
            {response && (
              <button
                onClick={() => setResponse(null)}
                style={{
                  background: "none", border: "none",
                  color: "var(--text-3)", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4, fontSize: 11,
                }}
              >
                <RotateCcw size={11} /> Clear
              </button>
            )}
          </div>

          {!response && !loading && (
            <div className="empty-state" style={{ flex: 1 }}>
              <Terminal size={28} opacity={0.2} />
              <span>Hit Send Request to see the response.</span>
            </div>
          )}

          {loading && (
            <div className="empty-state" style={{ flex: 1 }}>
              <span className="spinner" />
              <span>Waiting for response…</span>
            </div>
          )}

          {response && !loading && (
            <>
              <div className="pg-resp-meta">
                <span className={`badge ${statusClass(response.status)}`}
                  style={{ fontSize: 11, padding: "3px 8px" }}>
                  {response.status || "ERR"} {response.statusText}
                </span>
                <span className="pg-timing">{response.duration}ms</span>
              </div>

              {/* Interesting response headers */}
              <div className="pg-header-chips">
                {INTERESTING_HEADERS.map((h) =>
                  response.headers[h] ? (
                    <span key={h} className="pg-header-chip">
                      {h}: {response.headers[h]}
                    </span>
                  ) : null
                )}
              </div>

              <div
                className="pg-body"
                dangerouslySetInnerHTML={{ __html: syntaxHighlight(response.body) }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
