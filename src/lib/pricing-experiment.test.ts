import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  getCanonicalPlanId,
  getGridPlans,
  isOneTimePlanId,
} from "@/lib/constants";
import {
  getEffectivePricingVariant,
  getPricingGrid,
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
    assert.equal(pickPricingVariant(0.7), "lifetime");
  });

  it("rejects unknown cookie values, including the stopped grid_v2", () => {
    assert.equal(parsePricingVariant("lifetime"), "lifetime");
    assert.equal(parsePricingVariant("grid_v2"), null);
    assert.equal(parsePricingVariant("cheap"), null);
  });

  it("keeps everyone on the current grid while the test is off", () => {
    process.env.NEXT_PUBLIC_PRICING_EXPERIMENT = "";
    assert.equal(getEffectivePricingVariant("lifetime"), "control");
    process.env.NEXT_PUBLIC_PRICING_EXPERIMENT = "on";
    assert.equal(getEffectivePricingVariant("lifetime"), "lifetime");
    assert.equal(getEffectivePricingVariant(undefined), "control");
  });

  it("shows monthly, annual and lifetime to the lifetime half", () => {
    assert.deepEqual(
      getGridPlans(getPricingGrid("lifetime")).map((plan) => plan.id),
      ["monthly_v3", "annual_v3", "lifetime"]
    );
    assert.deepEqual(
      getGridPlans(getPricingGrid("control")).map((plan) => plan.id),
      ["monthly", "6months", "annual"]
    );
  });

  it("translates plan ids into the visitor's grid", () => {
    assert.equal(planIdForVariant("monthly", "lifetime"), "monthly_v3");
    assert.equal(planIdForVariant("annual", "lifetime"), "annual_v3");
    assert.equal(planIdForVariant("6months", "lifetime"), "annual_v3");
    assert.equal(planIdForVariant("lifetime", "lifetime"), "lifetime");
    assert.equal(planIdForVariant("lifetime", "control"), "annual");
    assert.equal(planIdForVariant("annual_v3", "control"), "annual");
    assert.equal(planIdForVariant("year_v2", "control"), "annual");
    assert.equal(planIdForVariant("annual", "control"), "annual");
  });

  it("only the lifetime plan is paid once", () => {
    assert.equal(isOneTimePlanId("lifetime"), true);
    assert.equal(isOneTimePlanId("annual_v3"), false);
    assert.equal(isOneTimePlanId("monthly"), false);
    assert.equal(isOneTimePlanId(null), false);
  });

  it("keeps a plan id when its Stripe price is unknown", () => {
    assert.equal(getCanonicalPlanId("lifetime"), "lifetime");
    assert.equal(getCanonicalPlanId("monthly"), "monthly");
  });
});
