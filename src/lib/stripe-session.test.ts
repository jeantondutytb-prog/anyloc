import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateCheckoutSession } from "./stripe-session";

type Session = Parameters<typeof evaluateCheckoutSession>[0];

function session(overrides: Partial<Session> = {}): Session {
  return {
    client_reference_id: "user-1",
    metadata: { plan_id: "annual" },
    customer_details: null,
    customer_email: null,
    status: "complete",
    payment_status: "paid",
    mode: "subscription",
    ...overrides,
  } as Session;
}

describe("evaluateCheckoutSession", () => {
  it("accepts a paid session of the user", () => {
    assert.deepEqual(evaluateCheckoutSession(session(), "user-1"), {
      verified: true,
      planId: "annual",
    });
  });

  it("refuses someone else's session", () => {
    assert.equal(evaluateCheckoutSession(session(), "user-2").verified, false);
  });

  it("accepts a guest session when the email matches", () => {
    const guest = session({
      client_reference_id: null,
      customer_details: { email: "Jo@Example.com" } as Session["customer_details"],
    });
    assert.equal(evaluateCheckoutSession(guest, "user-9", "jo@example.com").verified, true);
  });

  it("refuses a complete but still unpaid (SEPA) session", () => {
    const pending = session({ payment_status: "unpaid" });
    assert.deepEqual(evaluateCheckoutSession(pending, "user-1"), {
      verified: false,
      error: "Paiement non confirmé.",
    });
  });

  it("accepts a completed card-setup (trial) session", () => {
    const trial = session({ mode: "setup", payment_status: "no_payment_required" });
    assert.equal(evaluateCheckoutSession(trial, "user-1").verified, true);
  });
});
