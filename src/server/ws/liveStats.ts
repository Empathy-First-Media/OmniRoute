/**
 * Live-dashboard WebSocket connection telemetry.
 *
 * Pure counters module — no I/O, no side effects, unit-testable in isolation.
 * `liveServer.ts` instruments the lifecycle hooks; the snapshot is served
 * loopback-only on `GET /__omniroute_ws_stats` and surfaced to operators via
 * `GET /api/health/ws`.
 */

export interface LiveWsStatsSnapshot {
  /** Server-side epoch ms when this sidecar started accumulating counters. */
  startedAt: number;
  uptimeMs: number;
  /** Live subscriber count at snapshot time (clients.size). */
  activeClients: number;
  /** Upgrades that completed auth and became subscribers. */
  connectionsAccepted: number;
  /** Upgrades rejected before becoming a subscriber (any reason). */
  connectionsRejected: number;
  /** Rejection close codes seen (4001 unauthorized, 4003 origin, 4008 rate, 1013 full). */
  rejectionCodes: Record<string, number>;
  /** RFC 6455 close codes observed on accepted connections. */
  closeCodes: Record<string, number>;
  /** Connections terminated for missing pong within HEARTBEAT_TIMEOUT_MS. */
  heartbeatReaps: number;
  /** Dashboard events broadcast through publishDashboardEvent(). */
  eventsPublished: number;
  /** Client-to-server frames handled by handleMessage(). */
  messagesReceived: number;
  /** Server-to-client frames passed through sendTo(). */
  messagesSent: number;
}

const counters = {
  startedAt: Date.now(),
  connectionsAccepted: 0,
  connectionsRejected: 0,
  rejectionCodes: {} as Record<string, number>,
  closeCodes: {} as Record<string, number>,
  heartbeatReaps: 0,
  eventsPublished: 0,
  messagesReceived: 0,
  messagesSent: 0,
};

function bump(bucket: Record<string, number>, code: number | string): void {
  const key = String(code);
  bucket[key] = (bucket[key] ?? 0) + 1;
}

export const liveWsStats = {
  accepted(): void {
    counters.connectionsAccepted++;
  },
  rejected(closeCode: number | string): void {
    counters.connectionsRejected++;
    bump(counters.rejectionCodes, closeCode);
  },
  closed(closeCode: number | string): void {
    bump(counters.closeCodes, closeCode);
  },
  heartbeatReap(): void {
    counters.heartbeatReaps++;
  },
  eventPublished(): void {
    counters.eventsPublished++;
  },
  messageReceived(): void {
    counters.messagesReceived++;
  },
  messageSent(): void {
    counters.messagesSent++;
  },
  snapshot(activeClients: number): LiveWsStatsSnapshot {
    return {
      startedAt: counters.startedAt,
      uptimeMs: Date.now() - counters.startedAt,
      activeClients,
      connectionsAccepted: counters.connectionsAccepted,
      connectionsRejected: counters.connectionsRejected,
      rejectionCodes: { ...counters.rejectionCodes },
      closeCodes: { ...counters.closeCodes },
      heartbeatReaps: counters.heartbeatReaps,
      eventsPublished: counters.eventsPublished,
      messagesReceived: counters.messagesReceived,
      messagesSent: counters.messagesSent,
    };
  },
  /** Test-only: restore zeroed counters. */
  reset(): void {
    counters.startedAt = Date.now();
    counters.connectionsAccepted = 0;
    counters.connectionsRejected = 0;
    counters.heartbeatReaps = 0;
    counters.eventsPublished = 0;
    counters.messagesReceived = 0;
    counters.messagesSent = 0;
    for (const key of Object.keys(counters.rejectionCodes)) delete counters.rejectionCodes[key];
    for (const key of Object.keys(counters.closeCodes)) delete counters.closeCodes[key];
  },
};
