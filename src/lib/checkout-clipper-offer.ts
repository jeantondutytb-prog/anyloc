/**
 * A/B test of the clipper programme as a last resort on the checkout: shown to
 * half of the visitors who dismiss the -50 % close offer, the ones about to
 * leave without paying. Drawn on that dismissal and kept in a cookie. Only
 * runs with the -50 % test: closing the popup offers the shortest plan again
 * (shown to everyone from 27/10, it took the place of that offer as sales fell).
 */
export const CLIPPER_OFFER_VARIANTS = ["control", "clipper"] as const;

export type ClipperOfferVariant = (typeof CLIPPER_OFFER_VARIANTS)[number];

export const CLIPPER_OFFER_COOKIE = "anyloc-clipper-offer";

const CLIPPER_OFFER_MAX_AGE = 60 * 60 * 24 * 90;

/** utm_campaign of the applications coming from the checkout, read in clipper_applications. */
export const CLIPPER_OFFER_CAMPAIGN = "checkout_close";

export function parseClipperOfferVariant(value: unknown): ClipperOfferVariant | null {
  return CLIPPER_OFFER_VARIANTS.find((variant) => variant === value) ?? null;
}

/** This browser's variant, drawn and stored on the first call. */
export function getOrPickClipperOfferVariant(random = Math.random()): ClipperOfferVariant {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CLIPPER_OFFER_COOKIE}=([^;]*)`));
  const existing = parseClipperOfferVariant(match?.[1]);
  if (existing) return existing;

  const variant: ClipperOfferVariant = random < 0.5 ? "control" : "clipper";
  document.cookie = `${CLIPPER_OFFER_COOKIE}=${variant}; path=/; max-age=${CLIPPER_OFFER_MAX_AGE}; samesite=lax`;
  return variant;
}
