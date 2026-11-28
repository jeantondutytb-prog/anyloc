/**
 * Where a buyer first came from (UTM tags of the first visit and the site that
 * sent it), kept in a first-party cookie so it survives the onboarding, the
 * signup and the payment, then copied on the Stripe session and on
 * purchase_completed. Shared by the browser (writes it) and the server (reads it).
 */

import type Stripe from "stripe";

/** First-party cookie. Unrelated to the A/B test cookies: never touches them. */
export const FIRST_TOUCH_COOKIE = "anyloc-first-touch";

/** 90 days: the time a visit from a post can take to become a purchase. */
export const FIRST_TOUCH_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export const FIRST_TOUCH_UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
] as const;

export type FirstTouch = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  /** Sending site, without query string or hash (no personal data from it). */
  referrer?: string;
  /** Path of the first page seen, without query string. */
  landing_path?: string;
};

const FIRST_TOUCH_KEYS = [...FIRST_TOUCH_UTM_KEYS, "referrer", "landing_path"] as const;

/** Each value fits easily in a Stripe metadata value (500 characters max). */
const MAX_VALUE_LENGTH = 200;

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, MAX_VALUE_LENGTH) : undefined;
}

/** "https://l.instagram.com/?u=…" → "https://l.instagram.com/". Own site or no referrer → undefined. */
export function externalReferrer(referrer: string | null | undefined, ownHost: string) {
  if (!referrer) return undefined;

  try {
    const url = new URL(referrer);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (sameSite(url.hostname, ownHost)) return undefined;
    return clean(`${url.origin}${url.pathname}`);
  } catch {
    return undefined;
  }
}

/** anyloc.io and www.anyloc.io are the same site. */
function sameSite(host: string, ownHost: string) {
  const strip = (value: string) => value.toLowerCase().replace(/^www\./, "");
  return strip(host) === strip(ownHost);
}

/**
 * The attribution of a page load, or null when it carries none (no UTM, no
 * outside referrer): a direct visit never takes the place of a tagged one.
 */
export function firstTouchFromVisit(href: string, referrer: string | null | undefined): FirstTouch | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  const touch: FirstTouch = {};
  for (const key of FIRST_TOUCH_UTM_KEYS) {
    const value = clean(url.searchParams.get(key));
    if (value) touch[key] = value;
  }
  const outside = externalReferrer(referrer, url.hostname);
  if (outside) touch.referrer = outside;

  if (Object.keys(touch).length === 0) return null;

  touch.landing_path = clean(url.pathname) ?? "/";
  return touch;
}

/** Cookie value: a URL-encoded query string, readable by both sides. */
export function serializeFirstTouch(touch: FirstTouch) {
  const params = new URLSearchParams();
  for (const key of FIRST_TOUCH_KEYS) {
    const value = touch[key];
    if (value) params.set(key, value);
  }
  return encodeURIComponent(params.toString());
}

/** Never throws: a broken or forged cookie simply gives no attribution. */
export function parseFirstTouch(raw: string | null | undefined): FirstTouch | null {
  if (!raw) return null;

  let params: URLSearchParams;
  try {
    // Next's cookies() hands the value already decoded (it holds "="); the
    // raw header value doesn't (encodeURIComponent turns "=" into %3D).
    params = new URLSearchParams(raw.includes("=") ? raw : decodeURIComponent(raw));
  } catch {
    return null;
  }

  const touch: FirstTouch = {};
  for (const key of FIRST_TOUCH_KEYS) {
    const value = clean(params.get(key));
    if (value) touch[key] = value;
  }
  return Object.keys(touch).length > 0 ? touch : null;
}

/**
 * Stripe metadata of the session: `utm_source`, …, `first_referrer`,
 * `landing_path`. Keys are prefixed where Stripe's own words could clash.
 */
export function firstTouchMetadata(touch: FirstTouch | null): Record<string, string> {
  if (!touch) return {};

  const metadata: Record<string, string> = {};
  for (const key of FIRST_TOUCH_UTM_KEYS) {
    if (touch[key]) metadata[key] = touch[key]!;
  }
  if (touch.referrer) metadata.first_referrer = touch.referrer;
  if (touch.landing_path) metadata.landing_path = touch.landing_path;
  return metadata;
}

/** PostHog properties read back from the session metadata (null when absent, like `offer`). */
export function firstTouchProperties(metadata: Record<string, string> | null | undefined) {
  return {
    utm_source: metadata?.utm_source ?? null,
    utm_medium: metadata?.utm_medium ?? null,
    utm_campaign: metadata?.utm_campaign ?? null,
    utm_content: metadata?.utm_content ?? null,
    first_referrer: metadata?.first_referrer ?? null,
    landing_path: metadata?.landing_path ?? null,
  };
}

/**
 * Puts where the buyer first came from (UTM tags, sending site) on the
 * session, and on the subscription or the one-time PaymentIntent, so Stripe
 * reports and the webhook's purchase_completed can tell the sources apart.
 */
export function withFirstTouch(
  params: Stripe.Checkout.SessionCreateParams,
  touch: FirstTouch | null | undefined
): Stripe.Checkout.SessionCreateParams {
  const tags = firstTouchMetadata(touch ?? null);
  if (Object.keys(tags).length === 0) return params;

  return {
    ...params,
    metadata: { ...params.metadata, ...tags },
    ...(params.subscription_data
      ? { subscription_data: { ...params.subscription_data, metadata: { ...params.subscription_data.metadata, ...tags } } }
      : {}),
    ...(params.payment_intent_data
      ? { payment_intent_data: { ...params.payment_intent_data, metadata: { ...params.payment_intent_data.metadata, ...tags } } }
      : {}),
  };
}
