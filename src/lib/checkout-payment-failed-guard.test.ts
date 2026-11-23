import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { paymentFailedCheckoutResponse } from "./checkout-payment-failed-guard";

describe("paymentFailedCheckoutResponse", () => {
  it("answers 409 with a clear message and the card-fix page, and no session", async () => {
    const res = paymentFailedCheckoutResponse();
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.code, "payment_failed_update_card");
    assert.equal(body.redirectTo, "/dashboard/expired");
    assert.match(body.error, /Mets à jour ta carte/);
    assert.equal(body.clientSecret, undefined);
    assert.equal(body.url, undefined);
  });
});
