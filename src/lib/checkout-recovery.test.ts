import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRecoveryEmail,
  getDueRecoveryStep,
  getRecoveryOfferExpiry,
  isRecoveryOfferActive,
  isWelcomeOfferEnabled,
  signUnsubscribeToken,
  verifyUnsubscribeToken,
  type RecoveryState,
} from "./checkout-recovery";

const HOUR = 3600 * 1000;
const start = new Date("2026-10-03T10:00:00Z");
const at = (hours: number) => new Date(start.getTime() + hours * HOUR);

function state(overrides: Partial<RecoveryState> = {}): RecoveryState {
  return {
    firstCheckoutAt: start,
    stepsSent: 0,
    offerExpiresAt: null,
    convertedAt: null,
    unsubscribedAt: null,
    ...overrides,
  };
}

// Sat 3 Oct 12:00 Paris: the offer ends Sun 4 Oct 23:59:59 Paris (21:59:59 UTC), at(36) - 1 s.
const offerExpiresAt = getRecoveryOfferExpiry(start);

describe("getDueRecoveryStep", () => {
  it("waits one hour before the first email", () => {
    assert.equal(getDueRecoveryStep(state({ offerExpiresAt }), at(0.5)), null);
    assert.equal(getDueRecoveryStep(state({ offerExpiresAt }), at(1)), 1);
  });

  it("sends the last call in the 6 h before the offer ends, then the reminder at 72 h", () => {
    assert.equal(getDueRecoveryStep(state({ stepsSent: 1, offerExpiresAt }), at(29.9)), null);
    assert.equal(getDueRecoveryStep(state({ stepsSent: 1, offerExpiresAt }), at(30)), 2);
    assert.equal(getDueRecoveryStep(state({ stepsSent: 2, offerExpiresAt }), at(71)), null);
    assert.equal(getDueRecoveryStep(state({ stepsSent: 2, offerExpiresAt }), at(72)), 3);
    assert.equal(getDueRecoveryStep(state({ stepsSent: 3, offerExpiresAt }), at(100)), null);
  });

  it("never sends the last call once the offer is over", () => {
    assert.equal(getDueRecoveryStep(state({ stepsSent: 1, offerExpiresAt }), at(36)), null);
    assert.equal(getDueRecoveryStep(state({ stepsSent: 1 }), at(30)), null);
    assert.equal(getDueRecoveryStep(state({ stepsSent: 1 }), at(72)), 3);
  });

  it("only sends the latest due step when the cron fell behind", () => {
    assert.equal(getDueRecoveryStep(state({ offerExpiresAt }), at(31)), 2);
  });

  it("stops for buyers, unsubscribed users and stale sequences", () => {
    assert.equal(getDueRecoveryStep(state({ convertedAt: at(2) }), at(30)), null);
    assert.equal(getDueRecoveryStep(state({ unsubscribedAt: at(2) }), at(30)), null);
    assert.equal(getDueRecoveryStep(state({ stepsSent: 1 }), at(8 * 24)), null);
  });
});

describe("isRecoveryOfferActive", () => {
  it("ends at midnight Paris the day after the first paywall", () => {
    assert.equal(offerExpiresAt.toISOString(), "2026-10-04T21:59:59.000Z");
    // Late at night it still runs the whole next day: Sat 23:30 Paris -> Sun 23:59:59.
    assert.equal(
      getRecoveryOfferExpiry(new Date("2026-10-03T21:30:00Z")).toISOString(),
      "2026-10-04T21:59:59.000Z"
    );
    // Winter time: Mon 2 Nov 11:00 Paris -> Tue 3 Nov 23:59:59 Paris (22:59:59 UTC).
    assert.equal(
      getRecoveryOfferExpiry(new Date("2026-11-02T10:00:00Z")).toISOString(),
      "2026-11-03T22:59:59.000Z"
    );
  });

  it("runs from the first paywall until the expiry", () => {
    assert.equal(isRecoveryOfferActive(state({ offerExpiresAt }), at(0)), true);
    assert.equal(isRecoveryOfferActive(state({ stepsSent: 2, offerExpiresAt }), at(35.9)), true);
    assert.equal(isRecoveryOfferActive(state({ stepsSent: 2, offerExpiresAt }), at(36)), false);
    assert.equal(isRecoveryOfferActive(state(), at(1)), false);
  });

  it("is off once the user paid", () => {
    assert.equal(isRecoveryOfferActive(state({ offerExpiresAt, convertedAt: at(3) }), at(3)), false);
  });
});

describe("isWelcomeOfferEnabled", () => {
  it("is off unless WELCOME_OFFER is on", (t) => {
    assert.equal(isWelcomeOfferEnabled(), false);
    t.after(() => delete process.env.WELCOME_OFFER);
    process.env.WELCOME_OFFER = "on";
    assert.equal(isWelcomeOfferEnabled(), true);
  });
});

describe("unsubscribe tokens", () => {
  it("accepts the signed token and rejects others", () => {
    const token = signUnsubscribeToken("user-1");
    assert.equal(verifyUnsubscribeToken("user-1", token), true);
    assert.equal(verifyUnsubscribeToken("user-2", token), false);
    assert.equal(verifyUnsubscribeToken("user-1", "nope"), false);
  });
});

describe("buildRecoveryEmail", () => {
  const base = {
    appUrl: "https://www.anyloc.io",
    planId: "annual",
    unsubscribeUrl: "https://www.anyloc.io/api/email/unsubscribe?u=1&t=x",
  };

  it("announces the offer in the first email, on the monthly checkout, with its deadline", () => {
    const email = buildRecoveryEmail({ ...base, step: 1, offerExpiresAt });
    assert.match(email.subject, /4,95/);
    assert.match(email.text, /checkout\?plan=monthly&paiement=1&.*utm_content=step1/);
    assert.match(email.text, /valable jusqu'à dimanche 4 octobre à minuit\./);
    assert.match(email.html, /Ne plus recevoir ces emails/);
  });

  it("sends the last call for tonight", () => {
    const email = buildRecoveryEmail({ ...base, step: 2, offerExpiresAt });
    assert.match(email.subject, /Ce soir minuit/);
    assert.match(email.text, /utm_content=step2/);
  });

  it("keeps the chosen plan and gives no discount once the offer is over", () => {
    for (const step of [1, 3] as const) {
      const email = buildRecoveryEmail({ ...base, step, offerExpiresAt: null });
      assert.match(email.text, /checkout\?plan=annual&paiement=1&utm_source=email/);
      assert.doesNotMatch(email.text, /4,95/);
    }
    const last = buildRecoveryEmail({ ...base, step: 3, offerExpiresAt });
    assert.doesNotMatch(last.text, /4,95/);
  });
});
