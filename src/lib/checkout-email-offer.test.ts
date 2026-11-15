import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEmailOfferEmail,
  EMAIL_OFFER_DELAY_MS,
  EMAIL_OFFER_WINDOW_MS,
  getEmailOffer,
  isEmailOfferActive,
  isEmailOfferCoupon,
  pickEmailOfferVariant,
  planEmailOffer,
  RECOVERY_SUBJECT,
} from "./checkout-email-offer";

const firstView = new Date("2026-11-13T13:00:00Z"); // 14:00 Paris
const MINUTE = 60 * 1000;

describe("email offer prices", () => {
  it("knocks 20 € off lifetime, 10 € off annual and 2 € off monthly", () => {
    assert.equal(getEmailOffer("lifetime")?.offerPrice, "69 €");
    assert.equal(getEmailOffer("lifetime")?.amountOffCents, 2000);
    assert.equal(getEmailOffer("annual_v3")?.offerPrice, "39 €");
    assert.equal(getEmailOffer("annual")?.amountOffCents, 1000);
    assert.equal(getEmailOffer("monthly_v3")?.offerPrice, "7,90 €");
    assert.equal(getEmailOffer("monthly")?.amountOffCents, 200);
  });

  it("has no offer for plans outside the live grids", () => {
    assert.equal(getEmailOffer("6months"), null);
    assert.equal(getEmailOffer("year_v2"), null);
  });

  it("recognises its own coupons only", () => {
    assert.equal(isEmailOfferCoupon("RELANCE_MAIL_20EUR"), true);
    assert.equal(isEmailOfferCoupon("RELANCE50"), false);
  });
});

describe("pickEmailOfferVariant", () => {
  it("is stable for a user", () => {
    assert.equal(pickEmailOfferVariant("user-a"), pickEmailOfferVariant("user-a"));
  });

  it("splits users roughly in half", () => {
    const ids = Array.from({ length: 2000 }, (_, i) => `user-${i}`);
    const discount = ids.filter((id) => pickEmailOfferVariant(id) === "discount").length;
    assert.ok(discount > 900 && discount < 1100, `discount arm: ${discount}`);
  });

  it("follows the share at the extremes", () => {
    assert.equal(pickEmailOfferVariant("user-a", 1), "discount");
    assert.equal(pickEmailOfferVariant("user-a", 0), "reminder");
  });
});

describe("planEmailOffer", () => {
  const discountUser = Array.from({ length: 50 }, (_, i) => `u${i}`).find(
    (id) => pickEmailOfferVariant(id) === "discount"
  )!;
  const reminderUser = Array.from({ length: 50 }, (_, i) => `u${i}`).find(
    (id) => pickEmailOfferVariant(id) === "reminder"
  )!;

  it("sends 15 min after the first view and runs the discount 2 h from the email", () => {
    const plan = planEmailOffer(discountUser, "lifetime", firstView);
    assert.equal(plan.variant, "discount");
    assert.equal(plan.sendAt.getTime(), firstView.getTime() + EMAIL_OFFER_DELAY_MS);
    assert.equal(plan.expiresAt?.getTime(), plan.sendAt.getTime() + EMAIL_OFFER_WINDOW_MS);
  });

  it("gives the reminder arm no discount", () => {
    const plan = planEmailOffer(reminderUser, "lifetime", firstView);
    assert.equal(plan.variant, "reminder");
    assert.equal(plan.expiresAt, null);
  });

  it("only reminds on a plan without an offer, whatever the arm", () => {
    const plan = planEmailOffer(discountUser, "6months", firstView);
    assert.equal(plan.variant, "reminder");
    assert.equal(plan.expiresAt, null);
  });
});

describe("isEmailOfferActive", () => {
  const sendAt = new Date(firstView.getTime() + 15 * MINUTE);
  const expiresAt = new Date(sendAt.getTime() + 120 * MINUTE);
  const offer = { sendAt, expiresAt, convertedAt: null };

  it("is off before the email goes out: no silent discount on the paywall", () => {
    assert.equal(isEmailOfferActive(offer, new Date(sendAt.getTime() - MINUTE)), false);
  });

  it("runs from the email to its end", () => {
    assert.equal(isEmailOfferActive(offer, sendAt), true);
    assert.equal(isEmailOfferActive(offer, new Date(expiresAt.getTime() - 1)), true);
    assert.equal(isEmailOfferActive(offer, expiresAt), false);
  });

  it("stops once paid, and never runs for the reminder arm", () => {
    assert.equal(isEmailOfferActive({ ...offer, convertedAt: sendAt }, sendAt), false);
    assert.equal(isEmailOfferActive({ ...offer, expiresAt: null }, sendAt), false);
  });
});

describe("buildEmailOfferEmail", () => {
  const base = {
    appUrl: "https://www.anyloc.io",
    unsubscribeUrl: "https://www.anyloc.io/api/email/unsubscribe?u=1&t=x",
  };
  const expiresAt = new Date(firstView.getTime() + 135 * MINUTE); // 16:15 Paris

  it("announces the lifetime discount, its Paris deadline and links to the same plan", () => {
    const email = buildEmailOfferEmail({ ...base, planId: "lifetime", variant: "discount", expiresAt });
    assert.equal(email.subject, RECOVERY_SUBJECT);
    assert.match(email.text, /69 € au lieu de 89 €/);
    assert.match(email.text, /jusqu'à 16 h 15/);
    assert.match(email.text, /plan=lifetime&paiement=1/);
    assert.match(email.text, /utm_content=mail15_discount/);
    assert.match(email.html, /Ne plus recevoir ces emails/);
  });

  it("writes the monthly offer as a first month", () => {
    const email = buildEmailOfferEmail({ ...base, planId: "monthly_v3", variant: "discount", expiresAt });
    assert.match(email.text, /premier mois Anyloc à 7,90 €/);
  });

  it("names no price nor deadline in the reminder", () => {
    const email = buildEmailOfferEmail({ ...base, planId: "lifetime", variant: "reminder", expiresAt: null });
    assert.doesNotMatch(email.text, /€/);
    assert.doesNotMatch(email.text, /jusqu'à/);
    assert.match(email.text, /utm_content=mail15_reminder/);
  });

  it("keeps the same plain subject in both arms: no emoji, price nor deadline", () => {
    const discount = buildEmailOfferEmail({ ...base, planId: "lifetime", variant: "discount", expiresAt });
    const reminder = buildEmailOfferEmail({ ...base, planId: "lifetime", variant: "reminder", expiresAt: null });
    assert.equal(discount.subject, reminder.subject);
    assert.doesNotMatch(discount.subject, /€|\d|\p{Extended_Pictographic}/u);
  });
});
