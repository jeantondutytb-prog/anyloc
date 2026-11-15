import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest, NextResponse } from "next/server";
import { isNewGoogleSignup, trackGoogleSignup } from "./google-signup";
import {
  clearOAuthStartedCookie,
  OAUTH_STARTED_COOKIE,
  readOAuthStartedAt,
  setOAuthStartedCookie,
} from "./oauth";

const STARTED_AT = Date.parse("2026-11-15T12:00:00.000Z");

function googleUser(createdAt: string, provider = "google") {
  return {
    id: "8c1f0d2e-1111-4222-8333-944455556666",
    email: "new@example.com",
    created_at: createdAt,
    app_metadata: { provider, providers: [provider] },
  };
}

function recordingPostHog() {
  const calls: { kind: string; params: unknown }[] = [];
  return {
    calls,
    posthog: {
      identify: async (params: unknown) => {
        calls.push({ kind: "identify", params });
      },
      capture: async (params: unknown) => {
        calls.push({ kind: "capture", params });
      },
    },
  };
}

describe("isNewGoogleSignup", () => {
  it("is true for an account Google created during this round trip", () => {
    assert.equal(isNewGoogleSignup(googleUser("2026-11-15T12:00:07.000Z"), STARTED_AT), true);
  });

  it("tolerates a small clock gap between Supabase and Vercel", () => {
    assert.equal(isNewGoogleSignup(googleUser("2026-11-15T11:59:59.000Z"), STARTED_AT), true);
  });

  it("is false for a Google account created before the round trip (reconnection)", () => {
    assert.equal(isNewGoogleSignup(googleUser("2026-11-02T09:30:00.000Z"), STARTED_AT), false);
    // Signed up with Google a minute ago, clicks "Continuer avec Google" again.
    assert.equal(isNewGoogleSignup(googleUser("2026-11-15T11:59:00.000Z"), STARTED_AT), false);
  });

  it("is false for an email account, even one that just linked Google", () => {
    assert.equal(
      isNewGoogleSignup(googleUser("2026-11-15T12:00:07.000Z", "email"), STARTED_AT),
      false
    );
  });

  it("is false without a start stamp or with an unreadable created_at", () => {
    assert.equal(isNewGoogleSignup(googleUser("2026-11-15T12:00:07.000Z"), null), false);
    assert.equal(isNewGoogleSignup(googleUser("not a date"), STARTED_AT), false);
  });
});

describe("trackGoogleSignup", () => {
  it("sends signup_completed like the email signup, with method google", async () => {
    const { calls, posthog } = recordingPostHog();
    const user = googleUser("2026-11-15T12:00:07.000Z");

    assert.equal(await trackGoogleSignup(user, STARTED_AT, posthog), true);
    assert.deepEqual(calls, [
      {
        kind: "identify",
        params: { distinctId: user.id, properties: { email: user.email } },
      },
      {
        kind: "capture",
        params: {
          distinctId: user.id,
          event: "signup_completed",
          properties: { method: "google" },
        },
      },
    ]);
  });

  it("sends nothing on a Google reconnection", async () => {
    const { calls, posthog } = recordingPostHog();

    assert.equal(
      await trackGoogleSignup(googleUser("2026-11-02T09:30:00.000Z"), STARTED_AT, posthog),
      false
    );
    assert.deepEqual(calls, []);
  });

  it("sends nothing when the callback runs without a start stamp", async () => {
    const { calls, posthog } = recordingPostHog();

    assert.equal(
      await trackGoogleSignup(googleUser("2026-11-15T12:00:07.000Z"), null, posthog),
      false
    );
    assert.deepEqual(calls, []);
  });
});

describe("OAuth start cookie", () => {
  it("round-trips the start time from /auth/google to /auth/callback", () => {
    const start = new NextRequest("https://anyloc.io/auth/google");
    const redirect = NextResponse.redirect("https://accounts.google.com/");
    setOAuthStartedCookie(redirect, start, STARTED_AT);

    const cookie = redirect.cookies.get(OAUTH_STARTED_COOKIE);
    assert.equal(cookie?.value, String(STARTED_AT));
    assert.equal(cookie?.httpOnly, true);

    const callback = new NextRequest("https://anyloc.io/auth/callback?code=abc", {
      headers: { cookie: `${OAUTH_STARTED_COOKIE}=${STARTED_AT}` },
    });
    assert.equal(readOAuthStartedAt(callback), STARTED_AT);
  });

  it("ignores a missing or tampered value", () => {
    assert.equal(readOAuthStartedAt(new NextRequest("https://anyloc.io/auth/callback")), null);
    const tampered = new NextRequest("https://anyloc.io/auth/callback", {
      headers: { cookie: `${OAUTH_STARTED_COOKIE}=0x1F` },
    });
    assert.equal(readOAuthStartedAt(tampered), null);
  });

  it("is cleared by the callback, so a later login can't reuse it", () => {
    const request = new NextRequest("https://anyloc.io/auth/callback");
    const response = NextResponse.redirect("https://anyloc.io/dashboard");
    clearOAuthStartedCookie(response, request);

    const cookie = response.cookies.get(OAUTH_STARTED_COOKIE);
    assert.equal(cookie?.value, "");
    assert.equal(cookie?.maxAge, 0);
  });
});
