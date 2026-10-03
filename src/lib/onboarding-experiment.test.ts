import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseOnboardingVariant, pickOnboardingVariant } from "./onboarding-experiment";

describe("onboarding experiment", () => {
  it("splits visitors in two halves", () => {
    assert.equal(pickOnboardingVariant(0), "app_sandbox");
    assert.equal(pickOnboardingVariant(0.49), "app_sandbox");
    assert.equal(pickOnboardingVariant(0.5), "two_step");
    assert.equal(pickOnboardingVariant(0.99), "two_step");
  });

  it("only accepts known variants from the cookie", () => {
    assert.equal(parseOnboardingVariant("two_step"), "two_step");
    assert.equal(parseOnboardingVariant("app_sandbox"), "app_sandbox");
    assert.equal(parseOnboardingVariant("control"), null);
    assert.equal(parseOnboardingVariant(undefined), null);
  });
});
