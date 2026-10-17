import { getGridEntryPlanId } from "@/lib/constants";

/**
 * 1er mois à -50 % (coupon RELANCE50) sur la formule la plus courte, proposé
 * dans deux cas :
 * - la banque refuse la carte faute de solde ;
 * - A/B test : la moitié des visiteurs qui ferment la fenêtre de paiement.
 * Client-safe ; la partie Stripe est dans checkout-first-month-offer-server.
 */

/** Only an empty account is helped by a cheaper first payment (not fraud blocks or wrong numbers). */
export const DECLINE_OFFER_CODES = ["insufficient_funds"] as const;

/** How long after the checkout it comes from opened the discount can still be claimed. */
export const FIRST_MONTH_OFFER_WINDOW_MS = 2 * 60 * 60 * 1000;

/** Stripe metadata key the webhook sets on a checkout session refused for one of the codes above. */
export const DECLINE_METADATA_KEY = "decline_code";

export function isDeclineOfferCode(code: string | null | undefined) {
  return DECLINE_OFFER_CODES.some((offerCode) => offerCode === code);
}

/**
 * A/B test of the offer when the payment popup is closed. Drawn the first
 * time a visitor closes it, so only those visitors are in the test, and kept
 * in a cookie: the server reads it to allow the coupon.
 */
export const CLOSE_OFFER_VARIANTS = ["control", "offer"] as const;

export type CloseOfferVariant = (typeof CLOSE_OFFER_VARIANTS)[number];

export const CLOSE_OFFER_COOKIE = "anyloc-close-offer";

const CLOSE_OFFER_MAX_AGE = 60 * 60 * 24 * 90;

export function parseCloseOfferVariant(value: unknown): CloseOfferVariant | null {
  return CLOSE_OFFER_VARIANTS.find((variant) => variant === value) ?? null;
}

/** This browser's variant, drawn and stored on the first call. */
export function getOrPickCloseOfferVariant(random = Math.random()): CloseOfferVariant {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CLOSE_OFFER_COOKIE}=([^;]*)`));
  const existing = parseCloseOfferVariant(match?.[1]);
  if (existing) return existing;

  const variant: CloseOfferVariant = random < 0.5 ? "control" : "offer";
  document.cookie = `${CLOSE_OFFER_COOKIE}=${variant}; path=/; max-age=${CLOSE_OFFER_MAX_AGE}; samesite=lax`;
  return variant;
}

export type FirstMonthOfferReason = "declined" | "closed";

/**
 * Why the checkout `offerPlanId` is opened from entitles it to the discount at
 * `now`, or null: refused for lack of funds, or closed by a visitor of the
 * "offer" group. Either way only on the shortest plan of the same grid.
 */
export function getFirstMonthOfferReason(
  source: { declineCode?: string | null; planId?: string | null; createdAt: Date },
  offerPlanId: string,
  closeOfferVariant: CloseOfferVariant | null,
  now: Date
): FirstMonthOfferReason | null {
  if (!source.planId || offerPlanId !== getGridEntryPlanId(source.planId)) return null;
  if (now.getTime() - source.createdAt.getTime() > FIRST_MONTH_OFFER_WINDOW_MS) return null;
  if (isDeclineOfferCode(source.declineCode)) return "declined";
  return closeOfferVariant === "offer" ? "closed" : null;
}

/** "9,90€" -> "4,95 €": the first month once RELANCE50 (-50 %) is applied. */
export function getFirstMonthOfferPrice(price: string) {
  const amount = Number(price.replace("€", "").replace(",", ".").trim());
  return `${(Math.round(amount * 50) / 100).toFixed(2).replace(".", ",")} €`;
}
