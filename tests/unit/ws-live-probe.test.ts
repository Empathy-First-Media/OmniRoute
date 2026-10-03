import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { WebSocketServer } from "ws";

import { probeLiveWs } from "../../src/lib/ws/probe.ts";

const servers: Server[] = [];
after(() => servers.forEach((s) => s.close()));

describe("probeLiveWs", () => {
  it("reaches protocol stage on ping → pong", async () => {
    const http = createServer();
    servers.push(http);
    const wss = new WebSocketServer({ server: http });
    wss.on("connection", (ws) => {
      ws.on("message", (data) => {
        if (JSON.parse(String(data)).type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      });
    });
    const port = await new Promise<number>((r) =>
      http.listen(0, "127.0.0.1", () => r((http.address() as { port: number }).port))
    );

    const res = await probeLiveWs(`ws://127.0.0.1:${port}/live-ws`);
    assert.equal(res.reachable, true);
    assert.equal(res.stage, "protocol");
    assert.ok(res.handshakeMs !== null && res.handshakeMs >= 0);
    assert.ok(res.pongMs !== null && res.pongMs >= 0);
    assert.equal(res.authEnforced, false);
  });

  it("reports authEnforced on UNAUTHORIZED close 4001", async () => {
    const http = createServer();
    servers.push(http);
    const wss = new WebSocketServer({ server: http });
    wss.on("connection", (ws) => {
      ws.send(JSON.stringify({ type: "error", code: "UNAUTHORIZED", message: "Unauthorized" }));
      ws.close(4001, "Unauthorized");
    });
    const port = await new Promise<number>((r) =>
      http.listen(0, "127.0.0.1", () => r((http.address() as { port: number }).port))
    );

    const res = await probeLiveWs(`ws://127.0.0.1:${port}/live-ws`);
    assert.equal(res.reachable, true);
    assert.equal(res.authEnforced, true);
    assert.equal(res.closeCode, 4001);
  });

  it("reports unreachable when nothing listens", async () => {
    const res = await probeLiveWs("ws://127.0.0.1:1/live-ws", 800);
    assert.equal(res.reachable, false);
    assert.equal(res.stage, "connect");
  });

  it("bounds the probe when the peer never answers", async () => {
    const http = createServer((_req, res) => setTimeout(() => res.end(), 60_000).unref());
    servers.push(http);
    const port = await new Promise<number>((r) =>
      http.listen(0, "127.0.0.1", () => r((http.address() as { port: number }).port))
    );
    const t0 = Date.now();
    const res = await probeLiveWs(`ws://127.0.0.1:${port}/live-ws`, 500);
    assert.ok(Date.now() - t0 < 2000, "probe must be bounded");
    assert.equal(res.reachable, false);
  });
});
