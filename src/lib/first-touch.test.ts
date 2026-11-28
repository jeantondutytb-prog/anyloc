import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type Stripe from "stripe";
import {
  externalReferrer,
  FIRST_TOUCH_COOKIE,
  firstTouchFromVisit,
  firstTouchMetadata,
  firstTouchProperties,
  parseFirstTouch,
  serializeFirstTouch,
  withFirstTouch,
} from "./first-touch";
import { withCheckoutOffer } from "./checkout-offer";

const INSTAGRAM_BIO =
  "https://www.anyloc.io/?utm_source=ig&utm_medium=social&utm_content=link_in_bio";

describe("firstTouchFromVisit", () => {
  it("keeps the UTM tags Instagram adds to the bio link, and the sending site", () => {
    assert.deepEqual(firstTouchFromVisit(INSTAGRAM_BIO, "https://l.instagram.com/?u=https%3A%2F%2Fanyloc.io&e=secret"), {
      utm_source: "ig",
      utm_medium: "social",
      utm_content: "link_in_bio",
      referrer: "https://l.instagram.com/",
      landing_path: "/",
    });
  });

  it("keeps the /snap carousel tags", () => {
    assert.deepEqual(
      firstTouchFromVisit("https://www.anyloc.io/?utm_source=tiktok&utm_medium=carrousel", ""),
      { utm_source: "tiktok", utm_medium: "carrousel", landing_path: "/" }
    );
  });

  it("keeps an outside referrer alone, without its query string", () => {
    assert.deepEqual(
      firstTouchFromVisit("https://www.anyloc.io/pricing?x=1", "https://www.google.com/search?q=anyloc"),
      { referrer: "https://www.google.com/search", landing_path: "/pricing" }
    );
  });

  it("gives nothing for a direct visit or a visit from the site itself", () => {
    assert.equal(firstTouchFromVisit("https://www.anyloc.io/", ""), null);
    assert.equal(firstTouchFromVisit("https://www.anyloc.io/checkout", "https://anyloc.io/onboarding"), null);
    assert.equal(firstTouchFromVisit("https://www.anyloc.io/?utm_source=", "https://www.anyloc.io/"), null);
  });

  it("cuts very long values", () => {
    const touch = firstTouchFromVisit(`https://www.anyloc.io/?utm_campaign=${"a".repeat(900)}`, "");
    assert.equal(touch?.utm_campaign?.length, 200);
  });
});

describe("externalReferrer", () => {
  it("ignores www/non-www of the same site and non-web referrers", () => {
    assert.equal(externalReferrer("https://anyloc.io/x", "www.anyloc.io"), undefined);
    assert.equal(externalReferrer("android-app://com.instagram.android/", "www.anyloc.io"), undefined);
    assert.equal(externalReferrer("not a url", "www.anyloc.io"), undefined);
  });
});

describe("cookie round trip", () => {
  const touch = {
    utm_source: "ig",
    utm_medium: "social",
    utm_campaign: "été & co=1",
    utm_content: "link_in_bio",
    referrer: "https://l.instagram.com/",
    landing_path: "/",
  };

  it("reads back the raw header value", () => {
    assert.deepEqual(parseFirstTouch(serializeFirstTouch(touch)), touch);
  });

  it("reads back the value Next's cookies() hands over (already decoded)", () => {
    assert.deepEqual(parseFirstTouch(decodeURIComponent(serializeFirstTouch(touch))), touch);
  });

  it("is a single cookie-safe token", () => {
    assert.match(serializeFirstTouch(touch), /^[A-Za-z0-9%._~*'()!-]+$/);
  });

  it("gives nothing for a missing, empty or broken cookie", () => {
    assert.equal(parseFirstTouch(undefined), null);
    assert.equal(parseFirstTouch(""), null);
    assert.equal(parseFirstTouch("%E0%A4%A"), null);
    assert.equal(parseFirstTouch("foo=bar"), null);
  });
});

describe("withFirstTouch", () => {
  const touch = parseFirstTouch(
    serializeFirstTouch({ utm_source: "ig", utm_medium: "social", utm_content: "link_in_bio", referrer: "https://l.instagram.com/", landing_path: "/" })
  );
  const subscription: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    metadata: { plan_id: "monthly", guest_checkout: "true", checkout_type: "direct_subscription" },
    subscription_data: { metadata: { plan_id: "monthly", guest_checkout: "true" } },
  };
  const tags = {
    utm_source: "ig",
    utm_medium: "social",
    utm_content: "link_in_bio",
    first_referrer: "https://l.instagram.com/",
    landing_path: "/",
  };

  it("tags the session and its subscription, keeping the existing metadata", () => {
    const params = withFirstTouch(subscription, touch);
    assert.deepEqual(params.metadata, { ...subscription.metadata, ...tags });
    assert.deepEqual(params.subscription_data?.metadata, { ...subscription.subscription_data!.metadata, ...tags });
    assert.equal(params.payment_intent_data, undefined);
  });

  it("tags the PaymentIntent of a one-time payment", () => {
    const params = withFirstTouch(
      { mode: "payment", metadata: { plan_id: "lifetime" }, payment_intent_data: { metadata: { plan_id: "lifetime" } } },
      touch
    );
    assert.deepEqual(params.payment_intent_data?.metadata, { plan_id: "lifetime", ...tags });
    assert.equal(params.subscription_data, undefined);
  });

  it("leaves the params untouched without attribution", () => {
    assert.equal(withFirstTouch(subscription, null), subscription);
    assert.equal(withFirstTouch(subscription, undefined), subscription);
  });

  it("keeps the offer tag (Black Friday) next to the UTM", () => {
    const params = withCheckoutOffer(withFirstTouch(subscription, touch), "black_friday");
    assert.equal(params.metadata?.offer, "black_friday");
    assert.equal(params.metadata?.utm_source, "ig");
    assert.equal(params.subscription_data?.metadata?.offer, "black_friday");
  });

  it("stays within Stripe's metadata limits", () => {
    const long = parseFirstTouch(
      serializeFirstTouch({ utm_source: "x".repeat(900), referrer: `https://e.com/${"p".repeat(900)}` })
    );
    for (const [key, value] of Object.entries(withFirstTouch(subscription, long).metadata!)) {
      assert.ok(key.length <= 40, key);
      assert.ok(String(value).length <= 500, key);
    }
  });
});

describe("firstTouchProperties", () => {
  it("gives purchase_completed the tags of the session metadata", () => {
    const metadata = withFirstTouch(
      { mode: "subscription", metadata: { plan_id: "monthly" } },
      { utm_source: "ig", utm_medium: "social", utm_content: "link_in_bio" }
    ).metadata as Record<string, string>;
    assert.deepEqual(firstTouchProperties(metadata), {
      utm_source: "ig",
      utm_medium: "social",
      utm_campaign: null,
      utm_content: "link_in_bio",
      first_referrer: null,
      landing_path: null,
    });
  });

  it("is all null for a session without attribution", () => {
    assert.ok(Object.values(firstTouchProperties({ plan_id: "monthly" })).every((value) => value === null));
    assert.deepEqual(firstTouchMetadata(null), {});
  });
});

describe("A/B test cookies", () => {
  it("are never read or written by the attribution code", () => {
    for (const file of ["src/lib/first-touch.ts", "src/components/analytics/first-touch-capture.tsx"]) {
      const source = readFileSync(file, "utf8");
      assert.doesNotMatch(source, /onboarding-variant|pricing-variant|ONBOARDING_VARIANT|PRICING_VARIANT/);
    }
    assert.equal(FIRST_TOUCH_COOKIE, "anyloc-first-touch");
  });
});
