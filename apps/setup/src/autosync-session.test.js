const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const {
  MAX_POLL_DELAY_MS,
  MIN_POLL_DELAY_MS,
  SESSION_EXPIRED_MESSAGE,
  createSessionGuard,
  nextPollDelay,
} = require("./autosync-session");

describe("nextPollDelay: 1 s, doubling, capped at 30 s", () => {
  it("polls every second while it works", () => {
    assert.equal(nextPollDelay(0), MIN_POLL_DELAY_MS);
    assert.equal(MIN_POLL_DELAY_MS, 1000);
  });

  it("backs off 2, 4, 8, 16 s, then stays at 30 s", () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 50, 5000].map(nextPollDelay), [
      2000, 4000, 8000, 16000, 30000, 30000, 30000, 30000,
    ]);
    assert.equal(MAX_POLL_DELAY_MS, 30000);
  });

  it("treats odd input as no failure", () => {
    for (const odd of [-3, NaN, undefined, null, "x"]) assert.equal(nextPollDelay(odd), 1000);
  });
});

describe("createSessionGuard: one immediate renewal, then log out", () => {
  const OLD = { access_token: "old", refresh_token: "r1", user: { id: "u1" } };
  const FRESH = { access_token: "new", refresh_token: "r2", user: { id: "u1" } };

  function guardWith(results) {
    const calls = [];
    const guard = createSessionGuard({
      refresh: async (session) => {
        calls.push(session.refresh_token);
        const next = results.shift();
        if (next instanceof Error) throw next;
        return next;
      },
    });
    return { guard, calls };
  }

  it("a 401 renews the session at once and polling goes on", async () => {
    const { guard, calls } = guardWith([FRESH]);
    assert.deepEqual(await guard.onUnauthorized(OLD), { action: "renewed", session: FRESH });
    assert.deepEqual(calls, ["r1"]);
  });

  it("a failed renewal (refreshSession → null) logs out", async () => {
    const { guard } = guardWith([null]);
    assert.deepEqual(await guard.onUnauthorized(OLD), { action: "expired" });
  });

  it("a renewal that throws logs out", async () => {
    const { guard } = guardWith([new Error("network")]);
    assert.deepEqual(await guard.onUnauthorized(OLD), { action: "expired" });
  });

  it("a renewal without an access token logs out", async () => {
    const { guard } = guardWith([{ refresh_token: "r2" }]);
    assert.deepEqual(await guard.onUnauthorized(OLD), { action: "expired" });
  });

  it("a repeated 401 right after a renewal logs out without a 2nd renewal", async () => {
    const { guard, calls } = guardWith([FRESH, FRESH]);
    await guard.onUnauthorized(OLD);
    assert.deepEqual(await guard.onUnauthorized(FRESH), { action: "expired" });
    assert.deepEqual(calls, ["r1"]);
  });

  it("a successful poll re-arms the renewal for the next expiry (an hour later)", async () => {
    const { guard, calls } = guardWith([FRESH, { ...FRESH, access_token: "newer" }]);
    await guard.onUnauthorized(OLD);
    guard.onSuccess();
    assert.equal((await guard.onUnauthorized(FRESH)).action, "renewed");
    assert.deepEqual(calls, ["r1", "r2"]);
  });

  it("asks the user to log in again", () => {
    assert.match(SESSION_EXPIRED_MESSAGE, /Reconnecte-toi/);
  });
});

describe("main.js wiring (Electron itself is not loaded in tests)", () => {
  const source = require("node:fs").readFileSync(require("node:path").join(__dirname, "main.js"), "utf8");

  it("polls with a growing delay instead of a fixed 1 s setInterval", () => {
    assert.match(source, /nextPollDelay\(autoSyncFailures\)/);
    assert.doesNotMatch(source, /autoSyncInterval/);
  });

  it("renews through refreshSession and logs out with the expiry message", () => {
    assert.match(source, /createSessionGuard\(\{ refresh: refreshSession \}\)/);
    assert.match(source, /expireAutoSyncSession\(\)/);
    assert.match(source, /"setup:session-expired", \{ message: SESSION_EXPIRED_MESSAGE \}/);
    assert.match(source, /clearSessionFile\(\);\n  currentSession = null;/);
  });
});
