import { NextResponse } from "next/server";
import { deriveLiveWsPath, resolveLiveWsPublicUrl } from "@/shared/utils/wsPath";
import { probeLiveWs } from "@/lib/ws/probe";

/**
 * GET /api/health/ws — Live-dashboard WebSocket liveness probe
 *
 * Dials the live-WS sidecar (default 127.0.0.1:20132) and reports the furthest
 * handshake stage reached — TCP connect → WS open → protocol exchange — plus
 * the server's own connection lifecycle counters from the loopback-only
 * `/__omniroute_ws_stats` endpoint.
 *
 * The probe sends no credentials. A 4001 UNAUTHORIZED close or an
 * `{ type: "error", code: "UNAUTHORIZED" }` frame is a *healthy* outcome: it
 * proves the listener, upgrade path, and auth enforcement are all working.
 * `status: "ok"` means reachable; stage/auth detail is evidence, not failure.
 *
 * Returns `{ status, timestamp, ws: { ...probe, stats } }`; HTTP 503 when the
 * sidecar is unreachable. Auth-gated by the management boundary (not a public
 * route) since it reports internal connection counters.
 */

export const dynamic = "force-dynamic";

const PROBE_TIMEOUT_MS = 3000;
const STATS_TIMEOUT_MS = 2000;

export async function GET() {
  const startedAt = Date.now();
  const host = process.env.LIVE_WS_HOST || "127.0.0.1";
  const port = parseInt(process.env.LIVE_WS_PORT || "20132", 10);
  const path = deriveLiveWsPath(resolveLiveWsPublicUrl() ?? undefined);
  // When the sidecar binds 0.0.0.0 the dial target is still loopback — the
  // probe is a local liveness check, not a LAN connectivity test.
  const dialHost = host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;

  try {
    const probe = await probeLiveWs(`ws://${dialHost}:${port}${path}`, PROBE_TIMEOUT_MS);

    let stats: unknown = null;
    if (probe.reachable) {
      try {
        const res = await fetch(`http://${dialHost}:${port}/__omniroute_ws_stats`, {
          signal: AbortSignal.timeout(STATS_TIMEOUT_MS),
        });
        if (res.ok) stats = await res.json();
      } catch {
        /* stats are supplementary; probe evidence stands alone */
      }
    }

    return NextResponse.json(
      {
        status: probe.reachable ? "ok" : "error",
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        ws: { ...probe, stats },
      },
      {
        status: probe.reachable ? 200 : 503,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    console.error("[health/ws] Unexpected error in GET /api/health/ws:", error);
    return NextResponse.json({ status: "error", error: "ws_probe_failed" }, { status: 503 });
  }
}
