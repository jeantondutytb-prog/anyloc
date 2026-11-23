import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPaymentFailedCheckoutBlockWith,
  isPaymentFailedStatus,
  type CheckoutGuardProfile,
  UPDATE_CARD_PATH,
} from "./checkout-payment-failed-guard-core";
import { pickCheckoutCoupon } from "./black-friday";
import { getSubscriptionInactiveDetails } from "./subscription-inactive";

/** Deps that record every Stripe call, so a test can prove none happened. */
function deps(profile: CheckoutGuardProfile | null, stripeStatus: string | Error = "past_due") {
  const stripeCalls: string[] = [];
  return {
    stripeCalls,
    deps: {
      getProfile: async () => profile,
      getStripeSubscriptionStatus: async (id: string) => {
        stripeCalls.push(id);
        if (stripeStatus instanceof Error) throw stripeStatus;
        return stripeStatus;
      },
    },
  };
}

const BLOCKED = { blocked: true, redirectTo: UPDATE_CARD_PATH };
const ALLOWED = { blocked: false };

describe("getPaymentFailedCheckoutBlockWith", () => {
  for (const status of ["past_due", "unpaid", "incomplete"]) {
    it(`sends a ${status} profile with a live subscription to the card fix`, async () => {
      const { deps: d, stripeCalls } = deps(
        { subscription_status: status, stripe_subscription_id: "sub_old" },
        status
      );
      assert.deepEqual(await getPaymentFailedCheckoutBlockWith("u1", d), BLOCKED);
      assert.deepEqual(stripeCalls, ["sub_old"]);
    });
  }

  it("blocks when the profile lags and Stripe says the subscription is active again", async () => {
    const { deps: d } = deps(
      { subscription_status: "past_due", stripe_subscription_id: "sub_old" },
      "active"
    );
    assert.deepEqual(await getPaymentFailedCheckoutBlockWith("u1", d), BLOCKED);
  });

  it("blocks when Stripe cannot be read (unsure the old one stopped charging)", async () => {
    const { deps: d } = deps(
      { subscription_status: "past_due", stripe_subscription_id: "sub_old" },
      new Error("stripe down")
    );
    assert.deepEqual(await getPaymentFailedCheckoutBlockWith("u1", d), BLOCKED);
  });

  for (const ended of ["canceled", "incomplete_expired"]) {
    it(`lets a past_due profile buy again once Stripe says ${ended} (missed webhook)`, async () => {
      const { deps: d } = deps(
        { subscription_status: "past_due", stripe_subscription_id: "sub_old" },
        ended
      );
      assert.deepEqual(await getPaymentFailedCheckoutBlockWith("u1", d), ALLOWED);
    });
  }

  it("lets a failed-payment profile with no subscription on file through", async () => {
    const { deps: d, stripeCalls } = deps({ subscription_status: "unpaid", stripe_subscription_id: null });
    assert.deepEqual(await getPaymentFailedCheckoutBlockWith("u1", d), ALLOWED);
    assert.deepEqual(stripeCalls, []);
  });

  it("does not touch an active profile (the page sends it to /dashboard before)", async () => {
    const { deps: d, stripeCalls } = deps({ subscription_status: "active", stripe_subscription_id: "sub_1" });
    assert.deepEqual(await getPaymentFailedCheckoutBlockWith("u1", d), ALLOWED);
    assert.deepEqual(stripeCalls, []);
  });

  for (const status of ["canceled", "incomplete_expired"]) {
    it(`lets a ${status} (ended) former subscriber buy again, without a Stripe call`, async () => {
      const { deps: d, stripeCalls } = deps({ subscription_status: status, stripe_subscription_id: "sub_old" });
      assert.deepEqual(await getPaymentFailedCheckoutBlockWith("u1", d), ALLOWED);
      assert.deepEqual(stripeCalls, []);
    });
  }

  it("lets a first-time buyer through: no status, no Stripe call", async () => {
    const { deps: d, stripeCalls } = deps({ subscription_status: null, stripe_subscription_id: null });
    assert.deepEqual(await getPaymentFailedCheckoutBlockWith("u1", d), ALLOWED);
    assert.deepEqual(stripeCalls, []);
  });

  it("lets a buyer without a profile row through", async () => {
    const { deps: d } = deps(null);
    assert.deepEqual(await getPaymentFailedCheckoutBlockWith("u1", d), ALLOWED);
  });

  it("lets a guest checkout (no user) through without reading anything", async () => {
    let read = false;
    const result = await getPaymentFailedCheckoutBlockWith(null, {
      getProfile: async () => {
        read = true;
        return null;
      },
      getStripeSubscriptionStatus: async () => "past_due",
    });
    assert.deepEqual(result, ALLOWED);
    assert.equal(read, false);
  });

  it("Black Friday new buyer: the guard lets them through and the BF coupon still applies", async () => {
    const { deps: d, stripeCalls } = deps({ subscription_status: null, stripe_subscription_id: null });
    assert.deepEqual(await getPaymentFailedCheckoutBlockWith("u1", d), ALLOWED);
    assert.deepEqual(stripeCalls, []);
    // Same pick as before the guard: the coupon logic is untouched.
    assert.deepEqual(
      pickCheckoutCoupon({
        planId: "monthly",
        existing: null,
        blackFridayCouponId: "BF2026_20",
        now: new Date("2026-11-23T18:30:00Z"),
      }),
      { couponId: "BF2026_20", blackFriday: true }
    );
  });
});

describe("isPaymentFailedStatus", () => {
  it("matches the three failed-payment statuses only", () => {
    for (const status of ["past_due", "unpaid", "incomplete"]) {
      assert.equal(isPaymentFailedStatus(status), true, status);
    }
    for (const status of ["active", "trialing", "canceled", "incomplete_expired", null, undefined, ""]) {
      assert.equal(isPaymentFailedStatus(status), false, String(status));
    }
  });
});

describe("expired page for a blocked profile (no redirect loop back to /checkout)", () => {
  for (const status of ["past_due", "unpaid", "incomplete"]) {
    it(`${status}: offers the card fix instead of a new checkout`, () => {
      const details = getSubscriptionInactiveDetails({ subscription_status: status, plan_id: "monthly" });
      assert.equal(details.updatePaymentMethod, true);
      assert.equal(details.checkoutUrl, UPDATE_CARD_PATH);
      assert.equal(details.ctaLabel, "Mettre à jour ma carte");
    });
  }

  it("canceled: still goes to the paywall to buy again", () => {
    const details = getSubscriptionInactiveDetails({ subscription_status: "canceled", plan_id: "monthly" });
    assert.equal(details.updatePaymentMethod, false);
    assert.match(details.checkoutUrl, /^\/checkout\?plan=monthly/);
  });
});
