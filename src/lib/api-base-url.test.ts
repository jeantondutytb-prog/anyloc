import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getDefaultApiBaseUrl, sanitizeApiBaseUrl } from "./api-base-url";
import { buildMobileSetupLink } from "./device-setup-link";

const ORIGINAL = process.env.NEXT_PUBLIC_APP_URL;

function setAppUrl(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = value;
}

describe("API base URL handed to the apps (16/11: Android stuck in 401)", () => {
  beforeEach(() => setAppUrl("https://anyloc.io"));
  afterEach(() => setAppUrl(ORIGINAL));

  it("moves the bare anyloc.io to www, whose answers are not redirected", () => {
    assert.equal(sanitizeApiBaseUrl("https://anyloc.io"), "https://www.anyloc.io");
    assert.equal(sanitizeApiBaseUrl("anyloc.io"), "https://www.anyloc.io");
    assert.equal(sanitizeApiBaseUrl("http://ANYLOC.IO/"), "https://www.anyloc.io");
    assert.equal(sanitizeApiBaseUrl("https://www.anyloc.io"), "https://www.anyloc.io");
  });

  it("uses www as default even when NEXT_PUBLIC_APP_URL is the bare domain", () => {
    assert.equal(getDefaultApiBaseUrl(), "https://www.anyloc.io");
  });

  it("puts www in the anyloc://setup link", () => {
    const fromApi = new URL(buildMobileSetupLink("anyloc_x", "https://anyloc.io"));
    assert.equal(fromApi.searchParams.get("api"), "https://www.anyloc.io");

    // No apiBaseUrl from the server: falls back to the configured app URL.
    const fallback = new URL(buildMobileSetupLink("anyloc_x"));
    assert.equal(fallback.searchParams.get("api"), "https://www.anyloc.io");
  });

  it("leaves previews and local dev alone", () => {
    assert.equal(sanitizeApiBaseUrl("https://anyloc-abc.vercel.app"), "https://anyloc-abc.vercel.app");
    assert.equal(sanitizeApiBaseUrl("http://localhost:3000"), "http://localhost:3000");
    assert.equal(sanitizeApiBaseUrl("https://evil.example"), "https://www.anyloc.io");
  });
});
