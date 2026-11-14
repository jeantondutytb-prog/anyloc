import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTH_ATTEMPT_LIMITS,
  checkAuthAttempt,
  ipBucket,
  recordAuthSuccess,
  tooManyAttemptsMessage,
} from "./auth-attempt-limit";
import { getClientIpFromHeaders } from "./rate-limit";

let seq = 0;
function fresh() {
  seq += 1;
  const r = Math.floor(Math.random() * 250);
  return { email: `user${seq}-${Math.random()}@gmail.com`, ip: `10.${r}.${seq % 250}.${r}` };
}

describe("checkAuthAttempt", () => {
  it("blocks the 6th attempt on the same email from the same IP within 15 min", () => {
    const { email, ip } = fresh();
    const now = 1_000_000;
    for (let i = 0; i < AUTH_ATTEMPT_LIMITS.emailIp.limit; i += 1) {
      assert.equal(checkAuthAttempt({ email, ip, now: now + i }).ok, true);
    }
    const blocked = checkAuthAttempt({ email, ip, now: now + 10 });
    assert.equal(blocked.ok, false);
    assert.match(!blocked.ok ? blocked.error : "", /^Trop d'essais\. Réessaie dans 15 minutes/);
  });

  it("does not lock the owner out when someone else typed their email elsewhere", () => {
    const { email, ip: attacker } = fresh();
    const now = 1_500_000;
    for (let i = 0; i <= AUTH_ATTEMPT_LIMITS.emailIp.limit + 3; i += 1) {
      checkAuthAttempt({ email, ip: attacker, now });
    }
    assert.equal(checkAuthAttempt({ email, ip: attacker, now }).ok, false);
    assert.equal(checkAuthAttempt({ email, ip: "203.0.113.7", now }).ok, true);
  });

  it("caps one email across many IPs at the wide limit", () => {
    const { email } = fresh();
    const now = 1_800_000;
    for (let i = 0; i < AUTH_ATTEMPT_LIMITS.email.limit; i += 1) {
      assert.equal(checkAuthAttempt({ email, ip: `198.51.${seq % 250}.${i}`, now }).ok, true);
    }
    assert.equal(checkAuthAttempt({ email, ip: "192.0.2.200", now }).ok, false);
  });

  it("treats the email case-insensitively", () => {
    const { email, ip } = fresh();
    const now = 2_000_000;
    for (let i = 0; i < AUTH_ATTEMPT_LIMITS.emailIp.limit; i += 1) {
      checkAuthAttempt({ email: email.toUpperCase(), ip, now });
    }
    assert.equal(checkAuthAttempt({ email: ` ${email} `, ip, now }).ok, false);
  });

  it("lets the pair try again once the window has passed", () => {
    const { email, ip } = fresh();
    const now = 3_000_000;
    for (let i = 0; i <= AUTH_ATTEMPT_LIMITS.emailIp.limit; i += 1) {
      checkAuthAttempt({ email, ip, now });
    }
    assert.equal(checkAuthAttempt({ email, ip, now: now + AUTH_ATTEMPT_LIMITS.emailIp.windowMs }).ok, true);
  });

  it("blocks one IP after 30 attempts across different emails", () => {
    const { ip } = fresh();
    const now = 4_000_000;
    for (let i = 0; i < AUTH_ATTEMPT_LIMITS.ip.limit; i += 1) {
      assert.equal(checkAuthAttempt({ email: `${i}-${Math.random()}@x.io`, ip, now }).ok, true);
    }
    assert.equal(checkAuthAttempt({ email: `new-${Math.random()}@x.io`, ip, now }).ok, false);
  });

  it("never counts an unknown IP as one shared strict bucket", () => {
    const now = 5_000_000;
    for (let i = 0; i < AUTH_ATTEMPT_LIMITS.ip.limit + 5; i += 1) {
      assert.equal(checkAuthAttempt({ email: `${i}-${Math.random()}@x.io`, ip: "unknown", now }).ok, true);
    }
  });

  it("starts the IP's tries from zero after a successful login", () => {
    const { email, ip } = fresh();
    const now = 6_000_000;
    for (let i = 0; i < AUTH_ATTEMPT_LIMITS.emailIp.limit; i += 1) {
      checkAuthAttempt({ email, ip, now });
    }
    recordAuthSuccess(email.toUpperCase(), ip, now);
    assert.equal(checkAuthAttempt({ email, ip, now }).ok, true);
  });

  it("lets a recently trusted IP through while the email is capped elsewhere", () => {
    const { email, ip: home } = fresh();
    const now = 7_000_000;
    recordAuthSuccess(email, home, now);
    for (let i = 0; i < AUTH_ATTEMPT_LIMITS.email.limit + 5; i += 1) {
      checkAuthAttempt({ email, ip: `198.18.${seq % 250}.${i}`, now: now + 1 });
    }
    assert.equal(checkAuthAttempt({ email, ip: "198.18.250.1", now: now + 2 }).ok, false);
    assert.equal(checkAuthAttempt({ email, ip: home, now: now + 2 }).ok, true);
  });

  it("counts every address of one IPv6 /64 together", () => {
    const { email } = fresh();
    const now = 8_000_000;
    for (let i = 0; i < AUTH_ATTEMPT_LIMITS.emailIp.limit; i += 1) {
      assert.equal(checkAuthAttempt({ email, ip: `2001:db8:${seq}:1::${i + 1}`, now }).ok, true);
    }
    assert.equal(checkAuthAttempt({ email, ip: `2001:db8:${seq}:1:ffff::9`, now }).ok, false);
    assert.equal(checkAuthAttempt({ email, ip: `2001:db8:${seq}:2::1`, now }).ok, true);
  });
});

describe("ipBucket", () => {
  it("keeps IPv4 and reduces IPv6 to its /64", () => {
    assert.equal(ipBucket("203.0.113.9"), "203.0.113.9");
    assert.equal(ipBucket("2001:0DB8:0000:0001:aaaa:bbbb:cccc:dddd"), "2001:db8:0:1::/64");
    assert.equal(ipBucket("2001:db8::1"), "2001:db8:0:0::/64");
    assert.equal(ipBucket("2001:db8:5:6::"), "2001:db8:5:6::/64");
    assert.equal(ipBucket("::1"), "0:0:0:0::/64");
    assert.equal(ipBucket("::ffff:192.0.2.1"), "192.0.2.1");
  });
});

describe("tooManyAttemptsMessage", () => {
  it("rounds up to whole minutes, never below one", () => {
    assert.match(tooManyAttemptsMessage(5), /dans 1 minute\./);
    assert.match(tooManyAttemptsMessage(61), /dans 2 minutes\./);
  });
});

describe("getClientIpFromHeaders", () => {
  it("reads the Vercel headers, real IP first", () => {
    assert.equal(getClientIpFromHeaders(new Headers({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" })), "1.1.1.1");
    assert.equal(getClientIpFromHeaders(new Headers({ "x-forwarded-for": " 2.2.2.2 , 10.0.0.1" })), "2.2.2.2");
    assert.equal(getClientIpFromHeaders(new Headers({ "x-real-ip": "", "x-forwarded-for": "3.3.3.3" })), "3.3.3.3");
    assert.equal(getClientIpFromHeaders(new Headers()), "unknown");
  });
});
