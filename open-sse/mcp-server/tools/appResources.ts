import { registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const SESSION_SNAPSHOT_RESOURCE_URI = "ui://omniroute/session-snapshot.html";
export const SESSION_SNAPSHOT_RESOURCE_NAME = "omniroute_session_snapshot_view";

// Self-contained MCP App view (SEP-1865). No external network access is declared
// in the resource CSP meta, so the widget receives data exclusively through the
// host-proxied ui/notifications/tool-result channel (structuredContent).
const SESSION_SNAPSHOT_VIEW_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: light; --bg:#ffffff; --card:#f5f5fa; --text:#1a1a2e; --muted:#71717a; --border:rgba(0,0,0,.08); --accent:#6366f1; --err:#ef4444; }
  .dark { color-scheme: dark; --bg:#0b0e14; --card:#161b22; --text:#e6e6ef; --muted:#a1a1aa; --border:rgba(255,255,255,.08); }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: ui-sans-serif, system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 12px; font-size: 13px; }
  h2 { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 10px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin-bottom: 12px; }
  .stat { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
  .stat .v { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .stat .l { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .err .v { color: var(--err); }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; color: var(--muted); font-weight: 600; padding: 4px 6px; border-bottom: 1px solid var(--border); }
  td { padding: 4px 6px; border-bottom: 1px solid var(--border); font-variant-numeric: tabular-nums; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  #empty { color: var(--muted); padding: 16px; text-align: center; }
  @media (max-width: 420px) { .cols { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div id="empty">Waiting for tool result&hellip;</div>
<div id="root" hidden>
  <div class="grid">
    <div class="stat"><div class="v" id="v-requests">0</div><div class="l">Requests</div></div>
    <div class="stat"><div class="v" id="v-cost">$0</div><div class="l">Cost</div></div>
    <div class="stat"><div class="v" id="v-tokens">0</div><div class="l">Tokens</div></div>
    <div class="stat err"><div class="v" id="v-errors">0</div><div class="l">Errors</div></div>
    <div class="stat"><div class="v" id="v-duration">-</div><div class="l">Duration</div></div>
  </div>
  <div class="cols">
    <div><h2>Top models</h2><table id="t-models"></table></div>
    <div><h2>Top providers</h2><table id="t-providers"></table></div>
  </div>
</div>
<script>
(function () {
  "use strict";
  // Minimal SEP-1865 bridge: JSON-RPC 2.0 over window.postMessage.
  var nextId = 1;
  var pending = {};
  function send(msg) { window.parent.postMessage(msg, "*"); }
  function request(method, params) {
    var id = nextId++;
    pending[id] = true;
    send({ jsonrpc: "2.0", id: id, method: method, params: params || {} });
  }
  function notify(method, params) { send({ jsonrpc: "2.0", method: method, params: params || {} }); }

  var $ = function (id) { return document.getElementById(id); };
  function fmt(n) { return (n || 0).toLocaleString(); }
  function rows(el, list, nameKey) {
    var rows = "";
    (list || []).forEach(function (item) {
      rows += "<tr><td>" + String(item[nameKey] || "unknown").replace(/[<>&]/g, "") +
              "</td><td style='text-align:right'>" + fmt(item.count) + "</td></tr>";
    });
    el.innerHTML = rows || "<tr><td class='l' colspan='2'>none</td></tr>";
  }

  function applyTheme(ctx) {
    if (ctx && ctx.theme === "dark") document.documentElement.classList.add("dark");
  }

  function render(data) {
    if (!data || typeof data !== "object") return;
    $("empty").hidden = true;
    $("root").hidden = false;
    $("v-requests").textContent = fmt(data.requestCount);
    $("v-cost").textContent = "$" + (data.costTotal || 0).toFixed(4);
    var tk = data.tokenCount || {};
    $("v-tokens").textContent = fmt((tk.prompt || 0) + (tk.completion || 0));
    $("v-errors").textContent = fmt((data.errors || 0) + (data.fallbacks || 0));
    $("v-duration").textContent = data.duration || "-";
    rows($("t-models"), data.topModels, "model");
    rows($("t-providers"), data.topProviders, "provider");
    reportSize();
  }

  function reportSize() {
    notify("ui/notifications/size-changed", {
      width: document.body.scrollWidth,
      height: document.body.scrollHeight,
    });
  }

  window.addEventListener("message", function (event) {
    var msg = event.data;
    if (!msg || msg.jsonrpc !== "2.0") return;
    if (msg.method === "ui/notifications/tool-input") return;
    if (msg.method === "ui/notifications/tool-result" && msg.params) {
      render(msg.params.structuredContent);
      return;
    }
    if (msg.method === "ui/notifications/host-context-changed" && msg.params) {
      applyTheme(msg.params);
      return;
    }
    if (msg.id !== undefined) {
      if (msg.method === "ping") { send({ jsonrpc: "2.0", id: msg.id, result: {} }); return; }
      if (msg.method === "ui/resource-teardown") { send({ jsonrpc: "2.0", id: msg.id, result: {} }); return; }
      if (pending[msg.id] !== undefined || msg.result !== undefined || msg.error !== undefined) {
        // ui/initialize response: apply host theme, then announce readiness.
        delete pending[msg.id];
        if (msg.result && msg.result.hostContext) applyTheme(msg.result.hostContext);
        notify("ui/notifications/initialized");
      }
    }
  });

  request("ui/initialize", {
    appInfo: { name: "omniroute-session-snapshot", version: "1.0.0" },
    appCapabilities: {},
    protocolVersion: "2026-01-26",
  });
  if (window.ResizeObserver) new ResizeObserver(reportSize).observe(document.body);
})();
</script>
</body>
</html>`;

/** Registers MCP App (SEP-1865) view resources on the server. */
export function registerAppViews(server: McpServer): void {
  registerAppResource(
    server,
    SESSION_SNAPSHOT_RESOURCE_NAME,
    SESSION_SNAPSHOT_RESOURCE_URI,
    {
      mimeType: RESOURCE_MIME_TYPE,
      _meta: { ui: { prefersBorder: true } },
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: RESOURCE_MIME_TYPE, text: SESSION_SNAPSHOT_VIEW_HTML }],
    })
  );
}
