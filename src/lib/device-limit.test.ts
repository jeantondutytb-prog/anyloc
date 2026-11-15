import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeDevice } from "./device-list";
import {
  checkDeviceLimit,
  DEVICE_LIMIT_ERROR,
  MAX_DEVICES_PER_USER,
  UNUSED_DEVICE_TTL_MS,
  unusedDeviceCutoff,
  type DeviceLimitStore,
} from "./device-server";

const NOW = Date.parse("2026-11-15T12:00:00Z");
const HOUR = 60 * 60 * 1000;

type Row = { user_id: string; created_at: string; last_seen_at: string | null; pairing_data: string | null };

function row(userId: string, ageMs: number, used: "never" | "seen" | "paired" = "never"): Row {
  return {
    user_id: userId,
    created_at: new Date(NOW - ageMs).toISOString(),
    last_seen_at: used === "seen" ? new Date(NOW - HOUR).toISOString() : null,
    pairing_data: used === "paired" ? "encrypted" : null,
  };
}

/** Same filters as the Supabase store: user, never seen, never paired, created before the cutoff. */
function memoryStore(rows: Row[], { countFails = false } = {}) {
  const calls = { deletes: 0 };
  const store: DeviceLimitStore = {
    async countDevices(userId) {
      return countFails ? null : rows.filter((r) => r.user_id === userId).length;
    },
    async deleteUnusedDevicesBefore(userId, cutoff, max) {
      calls.deletes += 1;
      const stale = rows
        .filter((r) => r.user_id === userId && !r.last_seen_at && !r.pairing_data && r.created_at < cutoff)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .slice(0, max);
      for (const r of stale) rows.splice(rows.indexOf(r), 1);
      return stale.length;
    },
  };
  return { store, rows, calls };
}

function many(count: number, make: () => Row) {
  return Array.from({ length: count }, make);
}

describe("device limit", () => {
  it("lets a user under the limit add a device, without deleting anything", async () => {
    const { store, rows, calls } = memoryStore(many(MAX_DEVICES_PER_USER - 1, () => row("u1", 30 * 24 * HOUR)));
    assert.equal(await checkDeviceLimit("u1", store, NOW), false);
    assert.equal(calls.deletes, 0);
    assert.equal(rows.length, MAX_DEVICES_PER_USER - 1);
  });

  it("at 10/10 with only unused links, frees the oldest one and keeps the most recent", async () => {
    const latest = row("u1", 2 * 24 * HOUR);
    const rows = [...many(9, () => row("u1", 16 * 24 * HOUR)), latest];
    const { store } = memoryStore(rows);
    assert.equal(await checkDeviceLimit("u1", store, NOW), false);
    assert.equal(rows.length, MAX_DEVICES_PER_USER - 1);
    assert.ok(rows.includes(latest));
  });

  it("frees enough to get back under the limit when there are more links than it", async () => {
    const rows = many(12, () => row("u1", 5 * 24 * HOUR));
    const { store } = memoryStore(rows);
    assert.equal(await checkDeviceLimit("u1", store, NOW), false);
    assert.equal(rows.length, MAX_DEVICES_PER_USER - 1);
  });

  it("keeps links used by an app or paired with a computer, even old ones", async () => {
    const rows = [...many(5, () => row("u1", 40 * 24 * HOUR, "seen")), ...many(5, () => row("u1", 40 * 24 * HOUR, "paired"))];
    const { store } = memoryStore(rows);
    assert.equal(await checkDeviceLimit("u1", store, NOW), true);
    assert.equal(rows.length, MAX_DEVICES_PER_USER);
  });

  it("keeps a link made less than 24 h ago: its app may still be finishing its setup", async () => {
    const rows = [...many(9, () => row("u1", 3 * 24 * HOUR, "seen")), row("u1", 23 * HOUR)];
    const { store } = memoryStore(rows);
    assert.equal(await checkDeviceLimit("u1", store, NOW), true);
    assert.equal(rows.length, MAX_DEVICES_PER_USER);
  });

  it("frees one old unused link next to devices in use", async () => {
    const rows = [...many(8, () => row("u1", 5 * 24 * HOUR, "seen")), ...many(2, () => row("u1", 5 * 24 * HOUR))];
    const { store } = memoryStore(rows);
    assert.equal(await checkDeviceLimit("u1", store, NOW), false);
    assert.equal(rows.length, 9);
    assert.equal(rows.filter((r) => r.last_seen_at).length, 8);
  });

  it("never touches another user's links", async () => {
    const rows = [...many(10, () => row("u1", 5 * 24 * HOUR)), ...many(3, () => row("u2", 5 * 24 * HOUR))];
    const { store } = memoryStore(rows);
    await checkDeviceLimit("u1", store, NOW);
    assert.equal(rows.filter((r) => r.user_id === "u2").length, 3);
  });

  it("doesn't block anyone when the count fails, as before", async () => {
    const { store, calls } = memoryStore([], { countFails: true });
    assert.equal(await checkDeviceLimit("u1", store, NOW), false);
    assert.equal(calls.deletes, 0);
  });

  it("puts the cutoff exactly 24 h back", () => {
    assert.equal(UNUSED_DEVICE_TTL_MS, 24 * HOUR);
    assert.equal(unusedDeviceCutoff(NOW), "2026-11-14T12:00:00.000Z");
  });
});

describe("device list in Mon compte", () => {
  it("says when a link was never used, and when it was made", () => {
    const { title, detail } = describeDevice({
      id: "d1",
      platform: "android",
      deviceName: "Mon Android",
      lastSeenAt: null,
      createdAt: "2026-10-30T16:01:09Z",
    });
    assert.equal(title, "Mon Android");
    assert.match(detail, /^Android · jamais utilisé · créé le 30 oct\.? 2026$/);
  });

  it("shows the last use of a device in use", () => {
    const { detail } = describeDevice({
      id: "d2",
      platform: "ios",
      deviceName: "",
      lastSeenAt: "2026-11-15T10:00:00Z",
      createdAt: "2026-11-01T10:00:00Z",
    });
    assert.match(detail, /^iPhone · utilisé le 15 nov\.? 2026$/);
  });

  it("tells the customer where to remove a device", () => {
    assert.match(DEVICE_LIMIT_ERROR, /Mon compte, rubrique Appareils/);
    assert.match(DEVICE_LIMIT_ERROR, new RegExp(`limite de ${MAX_DEVICES_PER_USER} appareils`));
  });
});
