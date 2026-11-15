import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { GET as resetLinkRoute } from "@/app/auth/reset-password/route";
import {
  allowPasswordResetRequest,
  buildPasswordResetEmail,
  buildPasswordResetLink,
  isPlausibleTokenHash,
  isResetForCurrentBrowser,
  PASSWORD_RESET_LIMITS,
  RESET_TOKEN_COOKIE,
  RESET_TOKEN_MAX_AGE_SECONDS,
} from "./password-reset";

const TOKEN = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c";

let seq = 0;
function fresh() {
  seq += 1;
  return { email: `reset${seq}-${Math.random()}@gmail.com`, ip: `172.16.${seq % 250}.${Math.floor(Math.random() * 250)}` };
}

describe("allowPasswordResetRequest", () => {
  it("sends at most 3 links an hour to one address", () => {
    const { email } = fresh();
    const now = 1_000_000;
    for (let i = 0; i < PASSWORD_RESET_LIMITS.email.limit; i += 1) {
      assert.equal(allowPasswordResetRequest({ email, ip: `198.51.${seq}.${i}`, now }), true);
    }
    assert.equal(allowPasswordResetRequest({ email: ` ${email.toUpperCase()} `, ip: "203.0.113.50", now }), false);
    assert.equal(
      allowPasswordResetRequest({ email, ip: "203.0.113.51", now: now + PASSWORD_RESET_LIMITS.email.windowMs }),
      true
    );
  });

  it("stops one IP after 10 addresses an hour", () => {
    const { ip } = fresh();
    const now = 2_000_000;
    for (let i = 0; i < PASSWORD_RESET_LIMITS.ip.limit; i += 1) {
      assert.equal(allowPasswordResetRequest({ email: `${i}-${Math.random()}@x.io`, ip, now }), true);
    }
    assert.equal(allowPasswordResetRequest({ email: `new-${Math.random()}@x.io`, ip, now }), false);
  });

  it("never turns an unknown IP into one shared bucket", () => {
    const now = 3_000_000;
    for (let i = 0; i < PASSWORD_RESET_LIMITS.ip.limit + 5; i += 1) {
      assert.equal(allowPasswordResetRequest({ email: `${i}-${Math.random()}@x.io`, ip: "unknown", now }), true);
    }
  });
});

describe("reset link and email", () => {
  it("points to our route with the token", () => {
    assert.equal(
      buildPasswordResetLink("https://anyloc.io", TOKEN),
      `https://anyloc.io/auth/reset-password?token_hash=${TOKEN}`
    );
  });

  it("only accepts a token that looks like Supabase's", () => {
    assert.equal(isPlausibleTokenHash(TOKEN), true);
    assert.equal(isPlausibleTokenHash("short"), false);
    assert.equal(isPlausibleTokenHash(`${TOKEN}"><script>`), false);
    assert.equal(isPlausibleTokenHash(undefined), false);
  });

  it("says how long the link works and what to do if it wasn't you", () => {
    const link = buildPasswordResetLink("https://anyloc.io", TOKEN);
    const email = buildPasswordResetEmail(link);
    assert.match(email.subject, /mot de passe/);
    assert.match(email.text, new RegExp(TOKEN));
    assert.match(email.text, /1 heure, une seule fois/);
    assert.match(email.text, /ignore ce mail/);
    assert.match(email.html, /href="https:\/\/anyloc\.io\/auth\/reset-password\?token_hash=/);
  });
});

describe("GET /auth/reset-password", () => {
  it("keeps the token in an httpOnly cookie and leaves a clean URL", () => {
    const response = resetLinkRoute(
      new NextRequest(`https://anyloc.io/auth/reset-password?token_hash=${TOKEN}`)
    );
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get("location") ?? "").pathname, "/reset-password");
    assert.equal(new URL(response.headers.get("location") ?? "").search, "");
    const cookie = response.cookies.get(RESET_TOKEN_COOKIE);
    assert.equal(cookie?.value, TOKEN);
    assert.equal(cookie?.httpOnly, true);
    assert.equal(cookie?.maxAge, RESET_TOKEN_MAX_AGE_SECONDS);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  });

  it("sets nothing for a missing or odd token", () => {
    const response = resetLinkRoute(new NextRequest("https://anyloc.io/auth/reset-password?token_hash=x"));
    assert.equal(response.cookies.get(RESET_TOKEN_COOKIE), undefined);
    assert.equal(new URL(response.headers.get("location") ?? "").pathname, "/reset-password");
  });
});

describe("isResetForCurrentBrowser", () => {
  it("never swaps a logged-in browser to another account", () => {
    assert.equal(isResetForCurrentBrowser(null, "user-a"), true);
    assert.equal(isResetForCurrentBrowser("user-a", "user-a"), true);
    assert.equal(isResetForCurrentBrowser("user-a", "user-b"), false);
  });
});
