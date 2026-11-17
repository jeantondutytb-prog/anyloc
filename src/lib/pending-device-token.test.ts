import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  forgetPendingDeviceToken,
  parsePendingDeviceToken,
  resolvePendingDeviceToken,
  type PendingDeviceToken,
} from "./pending-device-token";

const KEY = "anyloc-pending-token-android";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const oldLink: PendingDeviceToken = {
  token: "anyloc_old",
  deviceId: "dev-old",
  apiBaseUrl: "https://www.anyloc.io",
};
const newLink: PendingDeviceToken = {
  token: "anyloc_new",
  deviceId: "dev-new",
  apiBaseUrl: "https://www.anyloc.io",
};

function setup(cached: unknown, ids: string[] | null | Error) {
  const storage = memoryStorage(
    cached === undefined ? {} : { [KEY]: typeof cached === "string" ? cached : JSON.stringify(cached) }
  );
  let creations = 0;
  const run = () =>
    resolvePendingDeviceToken({
      storage,
      platform: "android",
      listDeviceIds: async () => {
        if (ids instanceof Error) throw ids;
        return ids;
      },
      createDevice: async () => {
        creations += 1;
        return newLink;
      },
    });
  return { storage, run, creations: () => creations };
}

describe("resolvePendingDeviceToken", () => {
  it("reuses the cached link while its device still exists", async () => {
    const { run, creations } = setup(oldLink, ["dev-other", "dev-old"]);
    const result = await run();
    assert.deepEqual(result, { pending: oldLink, created: false });
    assert.equal(creations(), 0);
  });

  it("creates a new link when the cached device was deleted (16/11 ticket: app stuck in 401)", async () => {
    const { run, storage, creations } = setup(oldLink, ["dev-other"]);
    const result = await run();
    assert.deepEqual(result, { pending: newLink, created: true });
    assert.equal(creations(), 1);
    assert.deepEqual(JSON.parse(storage.data.get(KEY)!), newLink);
  });

  it("creates a new link when the device list can't be loaded", async () => {
    for (const ids of [null, new Error("network")]) {
      const { run, creations } = setup(oldLink, ids);
      assert.equal((await run()).pending.token, "anyloc_new");
      assert.equal(creations(), 1);
    }
  });

  it("drops an old cache entry without a device id instead of trusting it", async () => {
    const { run, creations } = setup({ token: "anyloc_legacy", apiBaseUrl: "x", platform: "android" }, ["dev-old"]);
    assert.equal((await run()).pending.token, "anyloc_new");
    assert.equal(creations(), 1);
  });

  it("creates a link when nothing is cached, without listing devices", async () => {
    let listed = false;
    const storage = memoryStorage();
    const result = await resolvePendingDeviceToken({
      storage,
      platform: "android",
      listDeviceIds: async () => {
        listed = true;
        return [];
      },
      createDevice: async () => newLink,
    });
    assert.equal(result.created, true);
    assert.equal(listed, false);
  });

  it("keeps the cache untouched when creating fails (limit reached)", async () => {
    const storage = memoryStorage();
    await assert.rejects(
      resolvePendingDeviceToken({
        storage,
        platform: "android",
        listDeviceIds: async () => [],
        createDevice: async () => {
          throw new Error("limite");
        },
      }),
      /limite/
    );
    assert.equal(storage.data.size, 0);
  });

  it("works without storage (private mode)", async () => {
    const result = await resolvePendingDeviceToken({
      storage: null,
      platform: "android",
      listDeviceIds: async () => [],
      createDevice: async () => newLink,
    });
    assert.equal(result.pending.token, "anyloc_new");
  });
});

describe("parsePendingDeviceToken", () => {
  it("rejects broken or incomplete entries", () => {
    assert.equal(parsePendingDeviceToken(null), null);
    assert.equal(parsePendingDeviceToken("{oops"), null);
    assert.equal(parsePendingDeviceToken(JSON.stringify({ ...oldLink, token: "xyz" })), null);
    assert.deepEqual(parsePendingDeviceToken(JSON.stringify(oldLink)), oldLink);
  });
});

describe("forgetPendingDeviceToken", () => {
  it("forgets the link made for the deleted device and keeps the others", () => {
    const storage = memoryStorage({
      [KEY]: JSON.stringify(oldLink),
      "anyloc-pending-token-ios": JSON.stringify({ ...newLink, deviceId: "dev-ios" }),
    });
    forgetPendingDeviceToken(storage, "dev-old");
    assert.equal(storage.data.has(KEY), false);
    assert.equal(storage.data.has("anyloc-pending-token-ios"), true);
  });

  it("also clears entries that can't be checked", () => {
    const storage = memoryStorage({ [KEY]: JSON.stringify({ token: "anyloc_legacy" }) });
    forgetPendingDeviceToken(storage, "dev-x");
    assert.equal(storage.data.size, 0);
  });
});
