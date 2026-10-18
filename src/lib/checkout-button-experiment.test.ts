import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  getEffectiveCheckoutButtonVariant,
  parseCheckoutButtonVariant,
  pickCheckoutButtonVariant,
} from "@/lib/checkout-button-experiment";

describe("checkout button experiment", () => {
  const previous = process.env.NEXT_PUBLIC_CHECKOUT_BUTTON_EXPERIMENT;

  afterEach(() => {
    process.env.NEXT_PUBLIC_CHECKOUT_BUTTON_EXPERIMENT = previous;
  });

  it("splits visitors in two halves", () => {
    assert.equal(pickCheckoutButtonVariant(0.2), "control");
    assert.equal(pickCheckoutButtonVariant(0.7), "apple_pay_direct");
  });

  it("rejects unknown cookie values", () => {
    assert.equal(parseCheckoutButtonVariant("apple_pay_direct"), "apple_pay_direct");
    assert.equal(parseCheckoutButtonVariant("grid_v2"), null);
  });

  it("keeps everyone on the current button while the test is off", () => {
    process.env.NEXT_PUBLIC_CHECKOUT_BUTTON_EXPERIMENT = "";
    assert.equal(getEffectiveCheckoutButtonVariant("apple_pay_direct"), "control");
    process.env.NEXT_PUBLIC_CHECKOUT_BUTTON_EXPERIMENT = "on";
    assert.equal(getEffectiveCheckoutButtonVariant("apple_pay_direct"), "apple_pay_direct");
    assert.equal(getEffectiveCheckoutButtonVariant(undefined), "control");
  });
});
