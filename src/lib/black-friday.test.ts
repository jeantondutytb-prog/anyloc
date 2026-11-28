import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  blackFridayPlanIdsOn,
  BLACK_FRIDAY_ENDS_AT,
  CHECKOUT_OFFER_BLACK_FRIDAY,
  formatEuroCents,
  getBlackFridayCouponId,
  getPaywallBlackFriday,
  isBlackFridayActive,
  pickCheckoutCoupon,
} from "./black-friday";
import { RECOVERY_COUPON_ID } from "./checkout-recovery";
import { PLANS } from "./constants";

const COUPON = "BF2026_20";
/** Monday 30/11 23:59:59.999, Paris (UTC+1). */
const LAST_INSTANT = new Date("2026-11-30T22:59:59.999Z");
/** Tuesday 01/12 00:00:00, Paris. */
const FIRST_INSTANT_AFTER = new Date("2026-11-30T23:00:00.000Z");
const DURING = new Date("2026-11-26T12:00:00+01:00");

describe("Black Friday window (Paris time, server clock)", () => {
  it("runs until Monday 30/11 23:59:59 in Paris", () => {
    assert.equal(isBlackFridayActive(DURING, COUPON), true);
    assert.equal(isBlackFridayActive(LAST_INSTANT, COUPON), true);
    assert.equal(isBlackFridayActive(new Date("2026-11-30T23:59:59+01:00"), COUPON), true);
  });

  it("stops on its own at 01/12 00:00 in Paris, though it is still 30/11 in UTC", () => {
    assert.equal(BLACK_FRIDAY_ENDS_AT.toISOString(), "2026-11-30T23:00:00.000Z");
    assert.equal(isBlackFridayActive(FIRST_INSTANT_AFTER, COUPON), false);
    assert.equal(isBlackFridayActive(new Date("2026-11-30T23:30:00Z"), COUPON), false);
    assert.equal(isBlackFridayActive(new Date("2026-12-05T10:00:00Z"), COUPON), false);
  });

  it("is off while the coupon variable is empty", () => {
    assert.equal(getBlackFridayCouponId({}), null);
    assert.equal(getBlackFridayCouponId({ STRIPE_COUPON_BLACK_FRIDAY: "  " }), null);
    assert.equal(getBlackFridayCouponId({ STRIPE_COUPON_BLACK_FRIDAY: " BF2026_20 " }), COUPON);
    assert.equal(isBlackFridayActive(DURING, null), false);
    assert.equal(getPaywallBlackFriday({ now: DURING, couponId: null }), null);
    assert.deepEqual(
      pickCheckoutCoupon({ planId: "monthly", existing: null, blackFridayCouponId: null, now: DURING }),
      { couponId: null, blackFriday: false }
    );
  });
});

describe("pickCheckoutCoupon: one discount only, the bigger one", () => {
  const pick = (planId: string, existing: string | null, now = DURING) =>
    pickCheckoutCoupon({ planId, existing, blackFridayCouponId: COUPON, now });

  it("applies the Black Friday coupon to every plan on sale", () => {
    for (const planId of ["monthly", "6months", "annual", "monthly_v3", "annual_v3"]) {
      assert.deepEqual(pick(planId, null), { couponId: COUPON, blackFriday: true }, planId);
    }
    assert.equal(CHECKOUT_OFFER_BLACK_FRIDAY, "black_friday");
  });

  it("gives nothing after the end, before as after a coupon", () => {
    assert.deepEqual(pick("monthly", null, LAST_INSTANT), { couponId: COUPON, blackFriday: true });
    assert.deepEqual(pick("monthly", null, FIRST_INSTANT_AFTER), { couponId: null, blackFriday: false });
    assert.deepEqual(pick("monthly", RECOVERY_COUPON_ID, FIRST_INSTANT_AFTER), {
      couponId: RECOVERY_COUPON_ID,
      blackFriday: false,
    });
  });

  it("keeps the -50 % of the 1st month (better than -20 %), never both", () => {
    assert.deepEqual(pick("monthly", RECOVERY_COUPON_ID), {
      couponId: RECOVERY_COUPON_ID,
      blackFriday: false,
    });
  });

  it("keeps the 15-min email's discount when it is at least as big", () => {
    // 9,90 €: -2 € (email) against -1,98 € (Black Friday).
    assert.deepEqual(pick("monthly", "RELANCE_MAIL_2EUR"), { couponId: "RELANCE_MAIL_2EUR", blackFriday: false });
    // 49 €: -10 € (email) against -9,80 €.
    assert.deepEqual(pick("annual", "RELANCE_MAIL_10EUR"), { couponId: "RELANCE_MAIL_10EUR", blackFriday: false });
  });

  it("never replaces a coupon it does not know (e.g. a future offer)", () => {
    assert.deepEqual(pick("annual", "SOME_OTHER_COUPON"), { couponId: "SOME_OTHER_COUPON", blackFriday: false });
  });

  it("leaves the lifetime plan and the stopped v2 grid alone", () => {
    assert.deepEqual(pick("lifetime", null), { couponId: null, blackFriday: false });
    assert.deepEqual(pick("year_v2", null), { couponId: null, blackFriday: false });
    assert.deepEqual(pick("unknown", null), { couponId: null, blackFriday: false });
  });
});

describe("getPaywallBlackFriday: what the paywall shows", () => {
  it("shows Jean's prices: 7,92 €, 27,92 € and 39,20 €, struck public price beside", () => {
    const offer = getPaywallBlackFriday({ now: DURING, couponId: COUPON });
    assert.ok(offer);
    assert.deepEqual(offer.prices.monthly, {
      offerPrice: "7,92 €",
      fullPrice: "9,90 €",
      terms: "le 1er mois, puis 9,90 €/mois",
      price: "7,92€",
      perDay: "0,26",
    });
    assert.deepEqual(offer.prices["6months"], {
      offerPrice: "27,92 €",
      fullPrice: "34,90 €",
      terms: "les 6 premiers mois, puis 34,90 € tous les 6 mois",
      price: "27,92€",
      perDay: "≈ 0,15",
    });
    assert.deepEqual(offer.prices.annual, {
      offerPrice: "39,20 €",
      fullPrice: "49 €",
      terms: "la 1re année, puis 49 €/an",
      price: "39,20€",
      perDay: "≈ 0,11",
    });
    assert.deepEqual(offer.prices.monthly_v3, offer.prices.monthly);
    assert.deepEqual(offer.prices.annual_v3, offer.prices.annual);
    assert.equal(offer.prices.lifetime, undefined);
    assert.equal(offer.prices.year_v2, undefined);
  });

  it("disappears with the same clock as the coupon", () => {
    assert.ok(getPaywallBlackFriday({ now: LAST_INSTANT, couponId: COUPON }));
    assert.equal(getPaywallBlackFriday({ now: FIRST_INSTANT_AFTER, couponId: COUPON }), null);
  });

  it("is not shown on a plan that already shows a bigger discount", () => {
    const welcome = getPaywallBlackFriday({ now: DURING, couponId: COUPON, welcomeOfferPlanId: "monthly" });
    assert.equal(welcome?.prices.monthly, undefined);
    assert.ok(welcome?.prices.annual);

    const email = getPaywallBlackFriday({
      now: DURING,
      couponId: COUPON,
      emailOfferPlanIds: ["monthly", "annual", "monthly_v3", "annual_v3", "lifetime"],
    });
    assert.equal(email?.prices.monthly, undefined);
    assert.equal(email?.prices.annual, undefined);
    assert.ok(email?.prices["6months"], "no email offer on the 6-month plan: Black Friday stays");
  });

  it("formats euros like the rest of the paywall", () => {
    assert.equal(formatEuroCents(792), "7,92 €");
    assert.equal(formatEuroCents(4900), "49 €");
    assert.equal(formatEuroCents(3920), "39,20 €");
  });
});

describe("A/B tests: Black Friday changes no assignment and no exposure", () => {
  it("reads and writes no cookie, draws no variant, sends no exposure event", () => {
    const source = readFileSync(new URL("./black-friday.ts", import.meta.url), "utf8");
    for (const forbidden of [
      "cookies(",
      "document.cookie",
      "VARIANT_COOKIE",
      "_COOKIE",
      "_experiment_exposed",
      "pickPricingVariant",
      "pickPriceDisplayVariant",
      "Math.random",
      "@/proxy",
    ]) {
      assert.equal(source.includes(forbidden), false, `black-friday.ts mentions ${forbidden}`);
    }
  });

  it("gives every visitor the same prices, whatever their test group", () => {
    // The only inputs are the clock, the coupon and the running offers: no group.
    const a = getPaywallBlackFriday({ now: DURING, couponId: COUPON });
    const b = getPaywallBlackFriday({ now: DURING, couponId: COUPON });
    assert.deepEqual(a, b);
    assert.equal(getPaywallBlackFriday.length, 1);
  });
});

describe("Quiz plan sheet: same Black Friday prices as /checkout", () => {
  const grid = PLANS.filter((plan) => ["monthly", "6months", "annual"].includes(plan.id));

  it("lists the grid's plans that show the offer, in grid order", () => {
    const offer = getPaywallBlackFriday({ now: DURING, couponId: COUPON });
    assert.deepEqual(blackFridayPlanIdsOn(grid, offer?.prices), ["monthly", "6months", "annual"]);
  });

  it("lists nothing once the offer is off (01/12 00:00 Paris) or without the coupon", () => {
    const ended = getPaywallBlackFriday({ now: FIRST_INSTANT_AFTER, couponId: COUPON });
    assert.deepEqual(blackFridayPlanIdsOn(grid, ended?.prices), []);
    const noCoupon = getPaywallBlackFriday({ now: DURING, couponId: null });
    assert.deepEqual(blackFridayPlanIdsOn(grid, noCoupon?.prices), []);
  });

  it("leaves out a plan already showing the bigger -50 % welcome offer, like /checkout", () => {
    const offer = getPaywallBlackFriday({ now: DURING, couponId: COUPON, welcomeOfferPlanId: "monthly" });
    assert.deepEqual(blackFridayPlanIdsOn(grid, offer?.prices), ["6months", "annual"]);
  });

  it("the sheet passes the server prices to the list and the CTA, and reports source quiz_sheet", () => {
    const sheet = readFileSync(
      new URL("../components/onboarding/quiz-plans-sheet.tsx", import.meta.url),
      "utf8"
    );
    assert.match(sheet, /blackFridayPrices=\{blackFridayPrices\}/);
    assert.match(sheet, /firstPayment=\{blackFridayPrices\?\.\[selectedPlan\.id\]\?\.offerPrice\}/);
    assert.match(sheet, /<BlackFridayBanner/);
    assert.match(sheet, /track\("black_friday_offer_shown"/);
    assert.match(sheet, /source: "quiz_sheet"/);
  });

  it("the quiz page computes the prices on the server, like /checkout", () => {
    const page = readFileSync(new URL("../app/onboarding/quiz/page.tsx", import.meta.url), "utf8");
    assert.match(page, /getPaywallBlackFridayForUser\(user\.id\)/);
    assert.match(page, /blackFriday=\{blackFriday\}/);
  });

  it("changes no A/B assignment or exposure: no cookie, variant draw or exposure event", () => {
    for (const file of [
      "../components/onboarding/quiz-plans-sheet.tsx",
      "../components/checkout/black-friday-banner.tsx",
      "./black-friday-server.ts",
    ]) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      for (const forbidden of [
        "cookies(",
        "document.cookie",
        "_COOKIE",
        "_experiment_exposed",
        "onboarding-experiment",
        "Math.random",
        "@/proxy",
      ]) {
        assert.equal(source.includes(forbidden), false, `${file} mentions ${forbidden}`);
      }
    }
  });
});
