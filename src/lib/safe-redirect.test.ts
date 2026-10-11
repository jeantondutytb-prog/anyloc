import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeRedirectPath } from "./safe-redirect";

describe("sanitizeRedirectPath", () => {
  it("keeps allowed internal paths with their query", () => {
    assert.equal(sanitizeRedirectPath("/dashboard/settings?tab=billing"), "/dashboard/settings?tab=billing");
    assert.equal(sanitizeRedirectPath("checkout?plan=annual"), "/checkout?plan=annual");
  });

  it("rejects open redirects", () => {
    for (const raw of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "HTTP://evil.com/dashboard",
    ]) {
      assert.equal(sanitizeRedirectPath(raw), "/dashboard", raw);
    }
  });

  it("rejects paths outside the allowlist and lookalike prefixes", () => {
    assert.equal(sanitizeRedirectPath("/api/account"), "/dashboard");
    assert.equal(sanitizeRedirectPath("/dashboard-evil"), "/dashboard");
  });

  it("falls back on empty input", () => {
    assert.equal(sanitizeRedirectPath(null, "/onboarding"), "/onboarding");
    assert.equal(sanitizeRedirectPath("   "), "/dashboard");
  });
});
