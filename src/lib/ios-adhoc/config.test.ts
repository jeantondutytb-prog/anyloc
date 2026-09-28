import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isEligibleForIosAdhoc } from "./config";

describe("isEligibleForIosAdhoc", () => {
  it("accepts paid annual, admin and clipper", () => {
    for (const planId of ["annual", "admin", "clipper"]) {
      assert.equal(isEligibleForIosAdhoc({ hasAccess: true, planId, isTrial: false }), true);
    }
  });

  it("rejects other plans, trials, inactive and missing access", () => {
    assert.equal(isEligibleForIosAdhoc({ hasAccess: true, planId: "monthly", isTrial: false }), false);
    assert.equal(isEligibleForIosAdhoc({ hasAccess: true, planId: "6months", isTrial: false }), false);
    assert.equal(isEligibleForIosAdhoc({ hasAccess: true, planId: "annual", isTrial: true }), false);
    assert.equal(isEligibleForIosAdhoc({ hasAccess: false, planId: "annual", isTrial: false }), false);
    assert.equal(isEligibleForIosAdhoc(null), false);
  });
});
