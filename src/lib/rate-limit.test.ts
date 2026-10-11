import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getClientIp, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows up to the limit, then blocks until the window resets", () => {
    const key = `test:${Math.random()}`;
    const start = 1_000_000;

    assert.deepEqual(rateLimit(key, 2, 60_000, start), { ok: true });
    assert.deepEqual(rateLimit(key, 2, 60_000, start + 1), { ok: true });
    assert.deepEqual(rateLimit(key, 2, 60_000, start + 1_000), {
      ok: false,
      retryAfterSeconds: 59,
    });
    assert.deepEqual(rateLimit(key, 2, 60_000, start + 60_000), { ok: true });
  });

  it("counts keys separately", () => {
    const now = 5_000_000;
    assert.equal(rateLimit(`a:${now}`, 1, 1_000, now).ok, true);
    assert.equal(rateLimit(`b:${now}`, 1, 1_000, now).ok, true);
  });
});

describe("getClientIp", () => {
  it("prefers x-real-ip, then the first forwarded hop", () => {
    assert.equal(getClientIp(new Request("https://x.io", { headers: { "x-real-ip": "1.1.1.1" } })), "1.1.1.1");
    assert.equal(
      getClientIp(new Request("https://x.io", { headers: { "x-forwarded-for": "2.2.2.2, 10.0.0.1" } })),
      "2.2.2.2"
    );
  });
});
