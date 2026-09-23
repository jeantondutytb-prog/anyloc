import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getConfiguredAppOrigin,
  getOAuthCallbackOrigin,
  getRequestOrigin,
  isSiteUrlOAuthFallback,
  normalizeOrigin,
} from "./oauth-origin";

function requestAt(url: string, headers?: Record<string, string>) {
  return new Request(url, { headers });
}

describe("normalizeOrigin", () => {
  it("forces https for public hosts", () => {
    assert.equal(normalizeOrigin("http://anyloc.io"), "https://anyloc.io");
    assert.equal(normalizeOrigin("www.anyloc.io"), "https://www.anyloc.io");
  });

  it("keeps http on localhost", () => {
    assert.equal(normalizeOrigin("http://localhost:3000"), "http://localhost:3000");
  });
});

describe("getRequestOrigin", () => {
  it("prefers forwarded host and proto", () => {
    const request = requestAt("http://127.0.0.1:3000/auth/google", {
      "x-forwarded-host": "www.anyloc.io",
      "x-forwarded-proto": "https",
    });

    assert.equal(getRequestOrigin(request), "https://www.anyloc.io");
  });
});

describe("getOAuthCallbackOrigin", () => {
  it("stays on the request host for localhost", () => {
    const request = requestAt("http://localhost:3000/auth/google");

    assert.equal(getOAuthCallbackOrigin(request), "http://localhost:3000");
  });

  it("stays on Vercel preview hosts", () => {
    const request = requestAt("https://anyloc-git-fix.vercel.app/auth/google");

    assert.equal(
      getOAuthCallbackOrigin(request),
      "https://anyloc-git-fix.vercel.app"
    );
  });

  it("stays on www when the user is on www", () => {
    const request = requestAt("https://www.anyloc.io/auth/google");

    assert.equal(getOAuthCallbackOrigin(request), "https://www.anyloc.io");
  });

  it("stays on apex when the user is on apex", () => {
    const request = requestAt("https://anyloc.io/auth/google");

    assert.equal(getOAuthCallbackOrigin(request), "https://anyloc.io");
  });
});

describe("getConfiguredAppOrigin", () => {
  it("prefers NEXT_PUBLIC_APP_URL", () => {
    assert.equal(
      getConfiguredAppOrigin("https://www.anyloc.io", "https://anyloc.io"),
      "https://www.anyloc.io"
    );
  });
});

describe("isSiteUrlOAuthFallback", () => {
  it("detects a code dumped on the landing page", () => {
    const url = new URL("https://anyloc.io/?code=abc123");
    assert.equal(isSiteUrlOAuthFallback(url.pathname, url.searchParams), true);
  });

  it("ignores a normal landing visit", () => {
    const url = new URL("https://anyloc.io/");
    assert.equal(isSiteUrlOAuthFallback(url.pathname, url.searchParams), false);
  });
});
