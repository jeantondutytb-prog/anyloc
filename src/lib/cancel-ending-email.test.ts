import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldSendCancelEndingEmail } from "./cancel-ending-email";

type Sub = Parameters<typeof shouldSendCancelEndingEmail>[0];

const now = new Date("2026-10-11T08:00:00Z");
const inDays = (days: number) => Math.floor((now.getTime() + days * 24 * 3600 * 1000) / 1000);

function sub(overrides: Partial<Sub> = {}): Sub {
  return {
    status: "active",
    cancel_at: inDays(3),
    cancel_at_period_end: true,
    metadata: { cancel_scheduled: "true" },
    items: { data: [{ current_period_end: inDays(3) }] },
    ...overrides,
  } as Sub;
}

describe("shouldSendCancelEndingEmail", () => {
  it("emails a subscription ending in about 3 days", () => {
    assert.equal(shouldSendCancelEndingEmail(sub(), now), true);
  });

  it("reads the period end when Stripe leaves cancel_at empty", () => {
    assert.equal(shouldSendCancelEndingEmail(sub({ cancel_at: null }), now), true);
  });

  it("skips subscriptions ending too soon or too late", () => {
    assert.equal(shouldSendCancelEndingEmail(sub({ cancel_at: inDays(1) }), now), false);
    assert.equal(shouldSendCancelEndingEmail(sub({ cancel_at: inDays(10) }), now), false);
  });

  it("never emails twice, nor a resumed or already ended subscription", () => {
    assert.equal(
      shouldSendCancelEndingEmail(
        sub({ metadata: { cancel_scheduled: "true", cancel_ending_email_sent: "true" } }),
        now
      ),
      false
    );
    assert.equal(
      shouldSendCancelEndingEmail(sub({ cancel_at: null, cancel_at_period_end: false }), now),
      false
    );
    assert.equal(shouldSendCancelEndingEmail(sub({ status: "canceled" }), now), false);
  });
});
