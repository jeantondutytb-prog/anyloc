import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRetentionOffer } from "./retention-offer";

type Sub = Parameters<typeof getRetentionOffer>[0];

function sub(overrides: Partial<Sub> = {}): Sub {
  return { status: "active", metadata: {}, discounts: [], cancel_at_period_end: false, ...overrides } as Sub;
}

describe("getRetentionOffer", () => {
  it("gives monthly plans 3 discounted months", () => {
    assert.deepEqual(getRetentionOffer(sub(), "monthly"), {
      eligible: true,
      kind: "repeating",
      label: "-50 % sur tes 3 prochains mois",
    });
  });

  it("gives longer plans the discount on their next renewal", () => {
    for (const plan of ["6months", "annual"]) {
      const offer = getRetentionOffer(sub(), plan);
      assert.equal(offer.eligible && offer.kind, "once", plan);
    }
  });

  it("is offered only once, never stacked, only on active subscriptions", () => {
    assert.equal(getRetentionOffer(sub({ metadata: { retention_offer_used: "true" } }), "monthly").eligible, false);
    assert.equal(getRetentionOffer(sub({ discounts: ["di_1"] }), "monthly").eligible, false);
    assert.equal(getRetentionOffer(sub({ status: "past_due" }), "monthly").eligible, false);
  });
});
