import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isStaleSubscriptionEvent } from "./subscription-sync";

describe("isStaleSubscriptionEvent", () => {
  it("ignores a canceled old subscription while the profile has a paid one", () => {
    assert.equal(
      isStaleSubscriptionEvent(
        { stripe_subscription_id: "sub_B", subscription_status: "active" },
        { id: "sub_A", status: "canceled" }
      ),
      true
    );
  });

  it("ignores a past_due old subscription while the profile is trialing", () => {
    assert.equal(
      isStaleSubscriptionEvent(
        { stripe_subscription_id: "sub_B", subscription_status: "trialing" },
        { id: "sub_A", status: "past_due" }
      ),
      true
    );
  });

  it("applies updates of the profile's own subscription", () => {
    assert.equal(
      isStaleSubscriptionEvent(
        { stripe_subscription_id: "sub_A", subscription_status: "active" },
        { id: "sub_A", status: "canceled" }
      ),
      false
    );
  });

  it("lets a new active subscription replace the current one", () => {
    assert.equal(
      isStaleSubscriptionEvent(
        { stripe_subscription_id: "sub_A", subscription_status: "active" },
        { id: "sub_B", status: "active" }
      ),
      false
    );
  });

  it("applies when the profile has no paid subscription to protect", () => {
    assert.equal(
      isStaleSubscriptionEvent(
        { stripe_subscription_id: "sub_B", subscription_status: "canceled" },
        { id: "sub_A", status: "past_due" }
      ),
      false
    );
    assert.equal(isStaleSubscriptionEvent(null, { id: "sub_A", status: "canceled" }), false);
  });
});
