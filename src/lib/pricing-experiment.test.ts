import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  getEffectivePricingVariant,
  parsePricingVariant,
  pickPricingVariant,
  planIdForVariant,
} from "@/lib/pricing-experiment";

describe("pricing experiment", () => {
  const previous = process.env.NEXT_PUBLIC_PRICING_EXPERIMENT;

  afterEach(() => {
    process.env.NEXT_PUBLIC_PRICING_EXPERIMENT = previous;
  });

  it("splits visitors in two halves", () => {
    assert.equal(pickPricingVariant(0.2), "control");
    assert.equal(pickPricingVariant(0.7), "grid_v2");
  });

  it("rejects unknown cookie values", () => {
    assert.equal(parsePricingVariant("grid_v2"), "grid_v2");
    assert.equal(parsePricingVariant("cheap"), null);
  });

  it("keeps everyone on the current grid while the test is off", () => {
    process.env.NEXT_PUBLIC_PRICING_EXPERIMENT = "";
    assert.equal(getEffectivePricingVariant("grid_v2"), "control");
    process.env.NEXT_PUBLIC_PRICING_EXPERIMENT = "on";
    assert.equal(getEffectivePricingVariant("grid_v2"), "grid_v2");
    assert.equal(getEffectivePricingVariant(undefined), "control");
  });

  it("translates plan ids into the visitor's grid", () => {
    assert.equal(planIdForVariant("annual", "grid_v2"), "quarter_v2");
    assert.equal(planIdForVariant("monthly", "grid_v2"), "month_v2");
    assert.equal(planIdForVariant("year_v2", "grid_v2"), "year_v2");
    assert.equal(planIdForVariant("year_v2", "control"), "annual");
    assert.equal(planIdForVariant("annual", "control"), "annual");
  });
});
