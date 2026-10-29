import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLANS } from "@/lib/constants";
import {
  getEffectivePriceDisplayVariant,
  getMonthlyDisplayPrice,
  parsePriceDisplayVariant,
  pickPriceDisplayVariant,
  roundUpToCharmPrice,
} from "@/lib/price-display-experiment";

describe("price display experiment", () => {
  it("splits visitors in two halves", () => {
    assert.equal(pickPriceDisplayVariant(0.2), "per_day");
    assert.equal(pickPriceDisplayVariant(0.7), "per_month");
  });

  it("shows per day to everyone while the test is off", (t) => {
    assert.equal(getEffectivePriceDisplayVariant("per_month"), "per_day");
    t.after(() => delete process.env.NEXT_PUBLIC_PRICE_DISPLAY_EXPERIMENT);
    process.env.NEXT_PUBLIC_PRICE_DISPLAY_EXPERIMENT = "on";
    assert.equal(getEffectivePriceDisplayVariant("per_month"), "per_month");
    assert.equal(getEffectivePriceDisplayVariant(undefined), "per_day");
  });

  it("rejects unknown cookie values", () => {
    assert.equal(parsePriceDisplayVariant("per_month"), "per_month");
    assert.equal(parsePriceDisplayVariant("per_week"), null);
  });

  it("rounds up to the next ,49 or ,99", () => {
    assert.equal(roundUpToCharmPrice(6.5833), 6.99);
    assert.equal(roundUpToCharmPrice(4.0833), 4.49);
    assert.equal(roundUpToCharmPrice(4.49), 4.49);
    assert.equal(roundUpToCharmPrice(4.995), 5.49);
  });

  it("shows every plan per month, never below its real monthly cost", () => {
    const shown = Object.fromEntries(PLANS.map((plan) => [plan.id, getMonthlyDisplayPrice(plan)]));
    assert.deepEqual(shown, {
      monthly: "9,90",
      "6months": "5,99",
      annual: "4,49",
      month_v2: "19",
      quarter_v2: "9,99",
      year_v2: "6,99",
    });
  });
});
