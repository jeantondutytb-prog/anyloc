import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getIosInstallState,
  needsNewBuild,
  type IosBuildRow,
  type IosDeviceRow,
} from "./build-queue";

const NOW = Date.parse("2026-10-01T12:00:00Z");
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

function device(overrides: Partial<IosDeviceRow> = {}): IosDeviceRow {
  return {
    id: "d1",
    user_id: "u1",
    status: "registered",
    udid: "U1",
    error: null,
    enrollment_expires_at: iso(-60_000),
    created_at: iso(60_000),
    ...overrides,
  };
}

function build(overrides: Partial<IosBuildRow> = {}): IosBuildRow {
  return {
    id: "b1",
    status: "succeeded",
    udids: ["U1"],
    ipa_blob_path: "releases/ios-adhoc/Anyloc-b1.ipa",
    bundle_version: "1",
    created_at: iso(60_000),
    ...overrides,
  };
}

describe("getIosInstallState", () => {
  it("not_started without device or with an expired enrollment", () => {
    assert.deepEqual(getIosInstallState({ device: null, latestSucceededBuild: null, now: NOW }), { kind: "not_started" });
    const expired = device({ status: "awaiting_udid", udid: null, enrollment_expires_at: iso(1) });
    assert.deepEqual(getIosInstallState({ device: expired, latestSucceededBuild: null, now: NOW }), { kind: "not_started" });
  });

  it("awaiting_udid while the enrollment is open", () => {
    const pending = device({ status: "awaiting_udid", udid: null });
    assert.deepEqual(getIosInstallState({ device: pending, latestSucceededBuild: null, now: NOW }), { kind: "awaiting_udid" });
  });

  it("failed with the stored error", () => {
    const failed = device({ status: "failed", error: "Cet iPhone est déjà lié à un autre compte." });
    assert.deepEqual(getIosInstallState({ device: failed, latestSucceededBuild: null, now: NOW }), {
      kind: "failed",
      message: "Cet iPhone est déjà lié à un autre compte.",
    });
  });

  it("preparing until a succeeded build includes the UDID, then ready", () => {
    assert.deepEqual(getIosInstallState({ device: device(), latestSucceededBuild: build({ udids: ["OTHER"] }), now: NOW }), { kind: "preparing" });
    assert.deepEqual(getIosInstallState({ device: device(), latestSucceededBuild: build(), now: NOW }), { kind: "ready", buildId: "b1" });
  });
});

describe("needsNewBuild", () => {
  it("false when every registered UDID is already signed", () => {
    assert.equal(needsNewBuild({ registeredUdids: ["U1"], latestBuild: build(), latestSucceededBuild: build(), now: NOW }), false);
  });

  it("true when a UDID is missing and nothing is queued", () => {
    assert.equal(needsNewBuild({ registeredUdids: ["U1", "U2"], latestBuild: build(), latestSucceededBuild: build(), now: NOW }), true);
    assert.equal(needsNewBuild({ registeredUdids: ["U1"], latestBuild: null, latestSucceededBuild: null, now: NOW }), true);
  });

  it("waits for a fresh queued build, retries a stale one", () => {
    const queued = build({ id: "b2", status: "queued", udids: [], created_at: iso(60_000) });
    assert.equal(needsNewBuild({ registeredUdids: ["U2"], latestBuild: queued, latestSucceededBuild: build(), now: NOW }), false);
    const stale = { ...queued, created_at: iso(46 * 60_000) };
    assert.equal(needsNewBuild({ registeredUdids: ["U2"], latestBuild: stale, latestSucceededBuild: build(), now: NOW }), true);
  });

  it("backs off 10 minutes after a failed build", () => {
    const failed = build({ id: "b3", status: "failed", udids: [], created_at: iso(5 * 60_000) });
    assert.equal(needsNewBuild({ registeredUdids: ["U2"], latestBuild: failed, latestSucceededBuild: build(), now: NOW }), false);
    const old = { ...failed, created_at: iso(11 * 60_000) };
    assert.equal(needsNewBuild({ registeredUdids: ["U2"], latestBuild: old, latestSucceededBuild: build(), now: NOW }), true);
  });
});
