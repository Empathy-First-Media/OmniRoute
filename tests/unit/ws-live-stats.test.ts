import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { liveWsStats } from "../../src/server/ws/liveStats.ts";

describe("liveWsStats counters", () => {
  it("starts zeroed and snapshots immutable copies", () => {
    liveWsStats.reset();
    const snap = liveWsStats.snapshot(0);
    assert.equal(snap.connectionsAccepted, 0);
    assert.equal(snap.activeClients, 0);
    snap.rejectionCodes["4001"] = 99;
    assert.equal(liveWsStats.snapshot(0).rejectionCodes["4001"], undefined);
  });

  it("counts accept/reject/close codes independently", () => {
    liveWsStats.reset();
    liveWsStats.accepted();
    liveWsStats.accepted();
    liveWsStats.rejected(4001);
    liveWsStats.rejected(4003);
    liveWsStats.rejected(4001);
    liveWsStats.closed(1000);
    liveWsStats.closed(1006);
    liveWsStats.heartbeatReap();
    liveWsStats.messageReceived();
    liveWsStats.messageSent();
    liveWsStats.eventPublished();

    const snap = liveWsStats.snapshot(3);
    assert.equal(snap.connectionsAccepted, 2);
    assert.equal(snap.connectionsRejected, 3);
    assert.deepEqual(snap.rejectionCodes, { "4001": 2, "4003": 1 });
    assert.deepEqual(snap.closeCodes, { "1000": 1, "1006": 1 });
    assert.equal(snap.heartbeatReaps, 1);
    assert.equal(snap.activeClients, 3);
    assert.equal(snap.messagesReceived, 1);
    assert.equal(snap.messagesSent, 1);
    assert.equal(snap.eventsPublished, 1);
    assert.ok(snap.uptimeMs >= 0);
  });
});
