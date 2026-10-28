import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickPostAuthRedirect } from "./auth-redirect";

describe("pickPostAuthRedirect", () => {
  it("sends a new account to the web remote when it asked for it", () => {
    assert.equal(pickPostAuthRedirect(false, "/app"), "/app");
    assert.equal(pickPostAuthRedirect(false, "/app?paye=1"), "/app?paye=1");
  });

  it("keeps checkout and onboarding for accounts without a subscription", () => {
    assert.equal(pickPostAuthRedirect(false, "/checkout?plan=annual"), "/checkout?plan=annual");
    assert.equal(pickPostAuthRedirect(false, "/onboarding/quiz?plan=annual"), "/onboarding/quiz?plan=annual");
  });

  it("sends other paths without a subscription to the expired page", () => {
    assert.equal(pickPostAuthRedirect(false, "/dashboard"), "/dashboard/expired");
    assert.equal(pickPostAuthRedirect(false, "/application"), "/dashboard/expired");
    assert.equal(pickPostAuthRedirect(false, null), "/dashboard/expired");
  });

  it("sends subscribers to the dashboard unless they asked for somewhere else", () => {
    assert.equal(pickPostAuthRedirect(true, "/checkout?plan=annual"), "/dashboard");
    assert.equal(pickPostAuthRedirect(true, null), "/dashboard");
    assert.equal(pickPostAuthRedirect(true, "/app"), "/app");
  });
});
