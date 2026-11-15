import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BUILD_FAILURE,
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

  it("reports a build that failed for this iPhone right away", () => {
    const failed = build({ id: "b2", status: "failed", udids: [], created_at: iso(30_000) });
    assert.deepEqual(
      getIosInstallState({ device: device(), latestSucceededBuild: null, latestBuild: failed, now: NOW }),
      { kind: "failed", message: BUILD_FAILURE }
    );
  });

  it("keeps preparing when the failed build predates the iPhone", () => {
    const old = build({ id: "b2", status: "failed", udids: [], created_at: iso(120_000) });
    assert.deepEqual(
      getIosInstallState({ device: device(), latestSucceededBuild: null, latestBuild: old, now: NOW }),
      { kind: "preparing" }
    );
  });
});

describe("needsNewBuild", () => {
  // Registered long before the builds below, unless a test says otherwise.
  const phone = (udid: string, msAgo = 2 * 60 * 60_000) => ({ udid, registered_at: iso(msAgo) });

  it("false when every registered UDID is already signed", () => {
    assert.equal(needsNewBuild({ registeredDevices: [phone("U1")], latestBuild: build(), latestSucceededBuild: build(), now: NOW }), false);
  });

  it("true when an iPhone registered after the latest build, or nothing was built yet", () => {
    const fresh = phone("U2", 30_000);
    assert.equal(needsNewBuild({ registeredDevices: [phone("U1"), fresh], latestBuild: build(), latestSucceededBuild: build(), now: NOW }), true);
    assert.equal(needsNewBuild({ registeredDevices: [phone("U1")], latestBuild: null, latestSucceededBuild: null, now: NOW }), true);
  });

  // Apple can take 1 to 2 days to list a new iPhone: the build succeeds without
  // it. Relaunching right away looped every minute for as long as Apple took.
  it("waits 30 minutes before retrying an iPhone Apple left out of the latest build", () => {
    const missing = phone("U2", 10 * 60_000);
    const justBuilt = build({ id: "b2", created_at: iso(60_000) });
    assert.equal(needsNewBuild({ registeredDevices: [missing], latestBuild: justBuilt, latestSucceededBuild: justBuilt, now: NOW }), false);

    const almost = build({ id: "b2", created_at: iso(29 * 60_000) });
    assert.equal(needsNewBuild({ registeredDevices: [phone("U2")], latestBuild: almost, latestSucceededBuild: almost, now: NOW }), false);

    const old = build({ id: "b2", created_at: iso(31 * 60_000) });
    assert.equal(needsNewBuild({ registeredDevices: [phone("U2")], latestBuild: old, latestSucceededBuild: old, now: NOW }), true);
  });

  it("waits for a fresh queued build, retries a stale one", () => {
    const queued = build({ id: "b2", status: "queued", udids: [], created_at: iso(60_000) });
    assert.equal(needsNewBuild({ registeredDevices: [phone("U2")], latestBuild: queued, latestSucceededBuild: build(), now: NOW }), false);
    const stale = { ...queued, created_at: iso(46 * 60_000) };
    assert.equal(needsNewBuild({ registeredDevices: [phone("U2")], latestBuild: stale, latestSucceededBuild: build(), now: NOW }), true);
  });

  it("backs off 2 minutes after a failed build", () => {
    const failed = build({ id: "b3", status: "failed", udids: [], created_at: iso(60_000) });
    assert.equal(needsNewBuild({ registeredDevices: [phone("U2")], latestBuild: failed, latestSucceededBuild: build(), now: NOW }), false);
    const old = { ...failed, created_at: iso(3 * 60_000) };
    assert.equal(needsNewBuild({ registeredDevices: [phone("U2")], latestBuild: old, latestSucceededBuild: build(), now: NOW }), true);
  });
});
