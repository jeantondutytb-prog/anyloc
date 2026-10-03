import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRecoveryEmail,
  getDueRecoveryStep,
  getRecoveryOfferExpiry,
  isRecoveryOfferActive,
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

describe("getDueRecoveryStep", () => {
  it("waits one hour before the first email", () => {
    assert.equal(getDueRecoveryStep(state(), at(0.5)), null);
    assert.equal(getDueRecoveryStep(state(), at(1)), 1);
  });

  it("sends steps 2 and 3 at 24 h and 72 h", () => {
    assert.equal(getDueRecoveryStep(state({ stepsSent: 1 }), at(23)), null);
    assert.equal(getDueRecoveryStep(state({ stepsSent: 1 }), at(24)), 2);
    assert.equal(getDueRecoveryStep(state({ stepsSent: 2 }), at(72)), 3);
    assert.equal(getDueRecoveryStep(state({ stepsSent: 3 }), at(100)), null);
  });

  it("only sends the latest due step when the cron fell behind", () => {
    assert.equal(getDueRecoveryStep(state(), at(30)), 2);
  });

  it("stops for buyers, unsubscribed users and stale sequences", () => {
    assert.equal(getDueRecoveryStep(state({ convertedAt: at(2) }), at(30)), null);
    assert.equal(getDueRecoveryStep(state({ unsubscribedAt: at(2) }), at(30)), null);
    assert.equal(getDueRecoveryStep(state({ stepsSent: 1 }), at(8 * 24)), null);
  });
});

describe("isRecoveryOfferActive", () => {
  const offerExpiresAt = getRecoveryOfferExpiry(start);

  it("ends at midnight Paris on the day 96 h after the first checkout", () => {
    // 2026-10-03 10:00 UTC + 96 h = Wed 7 Oct 12:00 Paris → 23:59:59 Paris (21:59:59 UTC).
    assert.equal(offerExpiresAt.toISOString(), "2026-10-07T21:59:59.000Z");
    // Winter time: 2026-11-02 10:00 UTC + 96 h → Fri 6 Nov 23:59:59 Paris (22:59:59 UTC).
    assert.equal(
      getRecoveryOfferExpiry(new Date("2026-11-02T10:00:00Z")).toISOString(),
      "2026-11-06T22:59:59.000Z"
    );
  });

  it("opens with the second email and closes at the expiry", () => {
    assert.equal(isRecoveryOfferActive(state({ stepsSent: 1, offerExpiresAt }), at(25)), false);
    assert.equal(isRecoveryOfferActive(state({ stepsSent: 2, offerExpiresAt }), at(25)), true);
    assert.equal(isRecoveryOfferActive(state({ stepsSent: 3, offerExpiresAt }), at(107)), true);
    assert.equal(isRecoveryOfferActive(state({ stepsSent: 3, offerExpiresAt }), at(108)), false);
  });

  it("is off once the user paid", () => {
    assert.equal(
      isRecoveryOfferActive(state({ stepsSent: 2, offerExpiresAt, convertedAt: at(30) }), at(30)),
      false
    );
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

  it("keeps the chosen plan and gives no discount in the first email", () => {
    const email = buildRecoveryEmail({ ...base, step: 1, offerExpiresAt: null });
    assert.match(email.text, /checkout\?plan=annual&paiement=1&utm_source=email/);
    assert.doesNotMatch(email.text, /4,95/);
    assert.match(email.html, /Ne plus recevoir ces emails/);
  });

  it("sends the offer emails to the monthly checkout with the deadline", () => {
    const email = buildRecoveryEmail({
      ...base,
      step: 2,
      offerExpiresAt: getRecoveryOfferExpiry(start),
    });
    assert.match(email.subject, /4,95/);
    assert.match(email.text, /checkout\?plan=monthly&.*utm_content=step2/);
    // 96 h after 2026-10-03 10:00 UTC, day only.
    assert.match(email.text, /valable jusqu'à mercredi 7 octobre\./);
  });
});
