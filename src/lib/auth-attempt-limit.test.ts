import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTH_ATTEMPT_LIMITS,
  checkAuthAttempt,
  clearAuthAttempts,
  tooManyAttemptsMessage,
} from "./auth-attempt-limit";
import { getClientIpFromHeaders } from "./rate-limit";

let seq = 0;
function fresh() {
  seq += 1;
  return { email: `user${seq}-${Math.random()}@gmail.com`, ip: `10.0.${seq}.${Math.floor(Math.random() * 250)}` };
}

describe("checkAuthAttempt", () => {
  it("blocks the 6th attempt on the same email within 15 min, even from other IPs", () => {
    const { email } = fresh();
    const now = 1_000_000;
    for (let i = 0; i < AUTH_ATTEMPT_LIMITS.email.limit; i += 1) {
      assert.equal(checkAuthAttempt({ email, ip: `1.2.3.${i}`, now: now + i }).ok, true);
    }
    const blocked = checkAuthAttempt({ email, ip: "9.9.9.9", now: now + 10 });
    assert.equal(blocked.ok, false);
    assert.match(!blocked.ok ? blocked.error : "", /^Trop d'essais\. Réessaie dans 15 minutes/);
  });

  it("treats the email case-insensitively", () => {
    const { email } = fresh();
    const now = 2_000_000;
    for (let i = 0; i < AUTH_ATTEMPT_LIMITS.email.limit; i += 1) {
      checkAuthAttempt({ email: email.toUpperCase(), ip: "unknown", now });
    }
    assert.equal(checkAuthAttempt({ email: ` ${email} `, ip: "unknown", now }).ok, false);
  });

  it("lets the email try again once the window has passed", () => {
    const { email } = fresh();
    const now = 3_000_000;
    for (let i = 0; i <= AUTH_ATTEMPT_LIMITS.email.limit; i += 1) {
      checkAuthAttempt({ email, ip: "unknown", now });
    }
    assert.equal(checkAuthAttempt({ email, ip: "unknown", now: now + AUTH_ATTEMPT_LIMITS.email.windowMs }).ok, true);
  });

  it("blocks one IP after 30 attempts across different emails", () => {
    const { ip } = fresh();
    const now = 4_000_000;
    for (let i = 0; i < AUTH_ATTEMPT_LIMITS.ip.limit; i += 1) {
      assert.equal(checkAuthAttempt({ email: `${i}-${Math.random()}@x.io`, ip, now }).ok, true);
    }
    assert.equal(checkAuthAttempt({ email: `new-${Math.random()}@x.io`, ip, now }).ok, false);
  });

  it("never counts an unknown IP as one shared bucket", () => {
    const now = 5_000_000;
    for (let i = 0; i < AUTH_ATTEMPT_LIMITS.ip.limit + 5; i += 1) {
      assert.equal(checkAuthAttempt({ email: `${i}-${Math.random()}@x.io`, ip: "unknown", now }).ok, true);
    }
  });

  it("starts the email from zero after a successful login", () => {
    const { email } = fresh();
    const now = 6_000_000;
    for (let i = 0; i < AUTH_ATTEMPT_LIMITS.email.limit; i += 1) {
      checkAuthAttempt({ email, ip: "unknown", now });
    }
    clearAuthAttempts(email.toUpperCase());
    assert.equal(checkAuthAttempt({ email, ip: "unknown", now }).ok, true);
  });
});

describe("tooManyAttemptsMessage", () => {
  it("rounds up to whole minutes, never below one", () => {
    assert.match(tooManyAttemptsMessage(5), /dans 1 minute,/);
    assert.match(tooManyAttemptsMessage(61), /dans 2 minutes,/);
  });
});

describe("getClientIpFromHeaders", () => {
  it("reads the Vercel headers, real IP first", () => {
    assert.equal(getClientIpFromHeaders(new Headers({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" })), "1.1.1.1");
    assert.equal(getClientIpFromHeaders(new Headers({ "x-forwarded-for": " 2.2.2.2 , 10.0.0.1" })), "2.2.2.2");
    assert.equal(getClientIpFromHeaders(new Headers({ "x-real-ip": "" , "x-forwarded-for": "3.3.3.3" })), "3.3.3.3");
    assert.equal(getClientIpFromHeaders(new Headers()), "unknown");
  });
});
