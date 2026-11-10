import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLANS } from "@/lib/constants";
import {
  getBillingCadence,
  getPayTodayLine,
  getPerMonthPrice,
  getPlanValueCard,
  getSavingsPercent,
} from "@/lib/quiz-paywall";

const plan = (id: string) => PLANS.find((candidate) => candidate.id === id)!;

describe("quiz paywall helpers", () => {
  it("prices a month exactly, to the cent", () => {
    assert.equal(getPerMonthPrice(plan("monthly")), "9,90");
    assert.equal(getPerMonthPrice(plan("6months")), "5,82");
    assert.equal(getPerMonthPrice(plan("annual")), "4,08");
  });

  it("computes the savings against the monthly plan", () => {
    assert.equal(getSavingsPercent(plan("annual"), plan("monthly")), 59);
    assert.equal(getSavingsPercent(plan("6months"), plan("monthly")), 41);
    assert.equal(getSavingsPercent(plan("monthly"), plan("monthly")), 0);
  });

  it("never reports a negative saving", () => {
    assert.equal(getSavingsPercent(plan("monthly"), plan("annual")), 0);
  });

  it("writes the pay-today line", () => {
    assert.equal(
      getPayTodayLine(plan("annual")),
      "49,00 € à payer aujourd'hui, puis tous les 12 mois · Résiliable en 1 clic"
    );
    assert.equal(
      getPayTodayLine(plan("6months")),
      "34,90 € à payer aujourd'hui, puis tous les 6 mois · Résiliable en 1 clic"
    );
    assert.equal(
      getPayTodayLine(plan("monthly")),
      "9,90 € à payer aujourd'hui, puis chaque mois · Résiliable en 1 clic"
    );
    assert.equal(
      getPayTodayLine(plan("monthly"), "4,95 €"),
      "4,95 € à payer aujourd'hui, puis chaque mois · Résiliable en 1 clic"
    );
    assert.equal(getBillingCadence("quarter_v2"), "tous les 3 mois");
  });

  it("picks the value card from the selected plan", () => {
    const monthly = plan("monthly");
    assert.deepEqual(getPlanValueCard(plan("annual"), monthly), {
      kind: "savings",
      title: "4,08 € par mois avec l'annuel",
      text: "59 % moins cher que le mensuel, et l'app mobile est incluse.",
    });
    assert.deepEqual(getPlanValueCard(plan("6months"), monthly), {
      kind: "savings",
      title: "5,82 € par mois sur 6 mois",
      text: "41 % moins cher que le mensuel.",
    });
    assert.deepEqual(getPlanValueCard(monthly, monthly), {
      kind: "guarantee",
      title: "Garantie 48 h",
      text: "Si ta loc ne bouge pas, ton 1er paiement est remboursé.",
    });
  });
});
