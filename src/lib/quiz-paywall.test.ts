import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLANS } from "@/lib/constants";
import {
  formatOrderPrice,
  getBillingCadence,
  getOrderPayToday,
  getOrderRenewalLine,
  getPayTodayLine,
  getPeriodLabel,
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
      text: "59 % moins cher que le mensuel, et l'iPhone s'installe sans ordi.",
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

  it("formats the order page's amounts and periods", () => {
    assert.equal(formatOrderPrice("49,00€"), "49 €");
    assert.equal(formatOrderPrice("9,90€"), "9,90 €");
    assert.equal(formatOrderPrice("29 €"), "29 €");
    assert.equal(formatOrderPrice("4,95 €"), "4,95 €");
    assert.equal(getPeriodLabel("monthly"), "1 mois");
    assert.equal(getPeriodLabel("6months"), "6 mois");
    assert.equal(getPeriodLabel("annual"), "12 mois");
    assert.equal(getPeriodLabel("quarter_v2"), "3 mois");
  });

  it("writes what is paid today and how it renews", () => {
    assert.equal(getOrderPayToday(plan("monthly")), "9,90 €");
    assert.equal(getOrderRenewalLine(plan("monthly")), "puis 9,90 € chaque mois");
    assert.equal(getOrderPayToday(plan("6months")), "34,90 €");
    assert.equal(getOrderRenewalLine(plan("6months")), "puis 34,90 € tous les 6 mois");
    assert.equal(getOrderPayToday(plan("annual")), "49 €");
    assert.equal(getOrderRenewalLine(plan("annual")), "puis 49 € tous les 12 mois");
  });

  it("charges the welcome offer today, then the full monthly price", () => {
    const offers = { welcomeOfferPrice: "4,95 €" };
    assert.equal(getOrderPayToday(plan("monthly"), offers), "4,95 €");
    assert.equal(getOrderRenewalLine(plan("monthly"), offers), "puis 9,90 € chaque mois");
  });

  it("keeps the annual exit offer price at renewal", () => {
    const offers = { annualExitOfferPrice: "29 €" };
    assert.equal(getOrderPayToday(plan("annual"), offers), "29 €");
    assert.equal(getOrderRenewalLine(plan("annual"), offers), "puis 29 € tous les 12 mois");
  });
});
