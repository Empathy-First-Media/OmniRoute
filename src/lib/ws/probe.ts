/**
 * Live-dashboard WebSocket liveness probe.
 *
 * Performs a real RFC 6455 upgrade against the live-WS sidecar and walks the
 * furthest stage reached: TCP connect → WS open → protocol exchange (ping →
 * pong, or a well-formed protocol error such as UNAUTHORIZED). Stages are
 * reported instead of collapsed into up/down; note a socket that answers
 * HTTP but refuses the upgrade surfaces as stage "connect" + unreachable —
 * there is no stage between TCP-open and upgrade-complete.
 */

import WebSocket from "ws";

export interface LiveWsProbeResult {
  /** TCP + HTTP upgrade path answered (listener is alive). */
  reachable: boolean;
  /** Furthest stage evidenced this run. */
  stage: "connect" | "open" | "protocol" | "closed";
  /** ms from dial to 'open'; null when the upgrade never completed. */
  handshakeMs: number | null;
  /** ms from app-ping send to app-pong receipt; null when unprobed. */
  pongMs: number | null;
  /** Server demanded auth this run (error frame or 4001/4003 close). */
  authEnforced: boolean;
  /** RFC 6455 close code observed, when the peer sent one. */
  closeCode: number | null;
}

const AUTH_CLOSE_CODES = new Set([4001, 4003]);

export function probeLiveWs(url: string, timeoutMs = 3000): Promise<LiveWsProbeResult> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const result: LiveWsProbeResult = {
      reachable: false,
      stage: "connect",
      handshakeMs: null,
      pongMs: null,
      authEnforced: false,
      closeCode: null,
    };

    let ws: WebSocket;
    let done = false;
    let pingSentAt: number | null = null;

    const finish = (stage: LiveWsProbeResult["stage"], reachable: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      result.stage = stage;
      result.reachable = reachable;
      try {
        ws?.close();
      } catch {
        /* peer already gone */
      }
      resolve(result);
    };

    const timer = setTimeout(() => {
      try {
        ws?.terminate();
      } catch {
        /* no socket yet */
      }
      finish(result.stage, result.stage !== "connect");
    }, timeoutMs);
    timer.unref?.();

    try {
      ws = new WebSocket(url);
    } catch {
      finish("connect", false);
      return;
    }

    ws.once("open", () => {
      result.handshakeMs = Date.now() - startedAt;
      result.stage = "open";
      pingSentAt = Date.now();
      try {
        ws.send(JSON.stringify({ type: "ping" }));
      } catch {
        finish("open", true);
      }
    });

    ws.on("message", (data) => {
      let msg: { type?: string; code?: string };
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (msg.type === "pong") {
        result.pongMs = pingSentAt === null ? null : Date.now() - pingSentAt;
        finish("protocol", true);
      } else if (msg.type === "error" && msg.code === "UNAUTHORIZED") {
        result.authEnforced = true;
      }
    });

    ws.once("close", (code) => {
      if (done) return; // our own terminate() — don't write a synthetic code post-resolve
      result.closeCode = code;
      if (AUTH_CLOSE_CODES.has(code)) result.authEnforced = true;
      finish(result.stage === "protocol" ? "protocol" : "closed", result.stage !== "connect");
    });

    ws.once("error", () => {
      finish(result.stage === "connect" ? "connect" : result.stage, result.stage !== "connect");
    });
  });
}
