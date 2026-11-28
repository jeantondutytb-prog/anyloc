import { getEmailOffer, isEmailOfferCoupon } from "@/lib/checkout-email-offer";
import { RECOVERY_COUPON_ID } from "@/lib/checkout-recovery";
import { PLANS, type Plan } from "@/lib/constants";
import { getPlanMonths } from "@/lib/price-display-experiment";

/**
 * Black Friday 2026: -20 % on the first payment of every plan, from the
 * release until Monday 30/11 at 23:59, Paris time. The server decides alone
 * (paywall render and checkout session), never the browser's clock. Off while
 * STRIPE_COUPON_BLACK_FRIDAY is empty; the coupon itself is created by Jean
 * in Stripe (20 %, "once", every product).
 *
 * Never two discounts: the annual exit offer always wins; against the -50 %
 * of the 1st month or the 15-min email's discount, the customer keeps the
 * bigger one.
 */

/** Offer tag on the Stripe session, checkout_started and purchase_completed. */
export const CHECKOUT_OFFER_BLACK_FRIDAY = "black_friday";

export const BLACK_FRIDAY_PERCENT_OFF = 20;

/** First instant without the offer: Tuesday 01/12/2026 00:00, Paris (UTC+1 in winter). */
export const BLACK_FRIDAY_ENDS_AT = new Date("2026-12-01T00:00:00+01:00");

/**
 * The subscription plans on sale. The v3 plans share the Stripe prices of
 * monthly and annual. Not the lifetime plan (paid once, grid stopped on
 * 14/11) nor the stopped v2 grid: the Stripe coupon does not cover them.
 */
export const BLACK_FRIDAY_PLAN_IDS: readonly string[] = [
  "monthly",
  "6months",
  "annual",
  "monthly_v3",
  "annual_v3",
];

export function getBlackFridayCouponId(env: Record<string, string | undefined> = process.env) {
  return env.STRIPE_COUPON_BLACK_FRIDAY?.trim() || null;
}

/** On while the coupon is set and Paris has not reached 01/12 00:00. */
export function isBlackFridayActive(now: Date, couponId: string | null) {
  return Boolean(couponId) && now.getTime() < BLACK_FRIDAY_ENDS_AT.getTime();
}

function findPlan(planId: string) {
  return PLANS.find((plan) => plan.id === planId);
}

export function isBlackFridayPlan(planId: string) {
  return BLACK_FRIDAY_PLAN_IDS.includes(planId);
}

/** "9,90€" -> 990, "89€" -> 8900. */
export function planPriceCents(plan: Pick<Plan, "price">) {
  return Math.round(Number(plan.price.replace("€", "").replace(",", ".").trim()) * 100);
}

export function blackFridayDiscountCents(priceCents: number) {
  return Math.round((priceCents * BLACK_FRIDAY_PERCENT_OFF) / 100);
}

/** "7,92 €", "39,20 €", "49 €". */
export function formatEuroCents(cents: number) {
  const euros = cents / 100;
  return `${Number.isInteger(euros) ? String(euros) : euros.toFixed(2).replace(".", ",")} €`;
}

/**
 * What a coupon we already apply takes off the first payment of `planId`.
 * Unknown coupon: treated as the better one, so it is never replaced.
 */
export function knownCouponDiscountCents(couponId: string, planId: string, priceCents: number) {
  if (couponId === RECOVERY_COUPON_ID) return Math.round(priceCents / 2);
  if (isEmailOfferCoupon(couponId)) {
    const offer = getEmailOffer(planId);
    if (offer?.couponId === couponId) return offer.amountOffCents;
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * The one coupon of a checkout, given the one the other offers picked
 * (`existing`, never the annual exit coupon: that one is settled before).
 * Black Friday only replaces it when it takes off strictly more.
 */
export function pickCheckoutCoupon({
  planId,
  existing,
  blackFridayCouponId,
  now,
}: {
  planId: string;
  existing: string | null;
  blackFridayCouponId: string | null;
  now: Date;
}): { couponId: string | null; blackFriday: boolean } {
  const plan = findPlan(planId);
  if (!plan || !isBlackFridayPlan(planId) || !isBlackFridayActive(now, blackFridayCouponId)) {
    return { couponId: existing, blackFriday: false };
  }

  const priceCents = planPriceCents(plan);
  if (existing && knownCouponDiscountCents(existing, planId, priceCents) >= blackFridayDiscountCents(priceCents)) {
    return { couponId: existing, blackFriday: false };
  }
  return { couponId: blackFridayCouponId, blackFriday: true };
}

export type BlackFridayPrice = {
  /** First payment with the discount: "7,92 €". */
  offerPrice: string;
  /** The current public price, struck through: "9,90 €". */
  fullPrice: string;
  /** After the prices: "le 1er mois, puis 9,90 €/mois". */
  terms: string;
  /** The discounted price in the plans' own format ("7,92€"), for the per-month figure. */
  price: string;
  /** The discounted price per day, in the plans' own format ("0,26", "≈ 0,11"). */
  perDay: string;
};

/** "le 1er mois, puis 9,90 €/mois", "les 6 premiers mois, puis …", "la 1re année, puis 49 €/an". */
function blackFridayTerms(months: number, fullPrice: string) {
  if (months === 1) return `le 1er mois, puis ${fullPrice}/mois`;
  if (months === 12) return `la 1re année, puis ${fullPrice}/an`;
  return `les ${months} premiers mois, puis ${fullPrice} tous les ${months} mois`;
}

/** Same day count as the plans' own figures: 30 days a month, 365 a year. */
function perDayLabel(cents: number, months: number) {
  const days = months === 1 ? 30 : (months * 365) / 12;
  const value = (cents / 100 / days).toFixed(2).replace(".", ",");
  return months === 1 ? value : `≈ ${value}`;
}

/**
 * The plans of a grid that show a Black Friday price, in grid order: what
 * black_friday_offer_shown reports. Empty when the offer is off.
 */
export function blackFridayPlanIdsOn(
  plans: readonly Pick<Plan, "id">[],
  prices: Record<string, BlackFridayPrice> | null | undefined
): string[] {
  if (!prices) return [];
  return plans.filter((plan) => prices[plan.id]).map((plan) => plan.id);
}

/** What the paywall shows, computed on the server; null when the offer is off. */
export type PaywallBlackFriday = {
  prices: Record<string, BlackFridayPrice>;
};

/**
 * The paywall's Black Friday prices. Plans already showing a bigger running
 * discount (the -50 % welcome offer, the 15-min email's) are left out: the
 * page never shows two discounts on one plan.
 */
export function getPaywallBlackFriday({
  now,
  couponId,
  welcomeOfferPlanId,
  emailOfferPlanIds = [],
}: {
  now: Date;
  couponId: string | null;
  /** Plan of the -50 % welcome offer while it runs. */
  welcomeOfferPlanId?: string | null;
  /** Plans covered by the 15-min email's discount while it runs. */
  emailOfferPlanIds?: readonly string[];
}): PaywallBlackFriday | null {
  if (!isBlackFridayActive(now, couponId)) return null;

  const prices: Record<string, BlackFridayPrice> = {};
  for (const plan of PLANS) {
    if (!isBlackFridayPlan(plan.id)) continue;
    const priceCents = planPriceCents(plan);
    const discount = blackFridayDiscountCents(priceCents);
    if (plan.id === welcomeOfferPlanId && Math.round(priceCents / 2) >= discount) continue;
    const emailOffer = emailOfferPlanIds.includes(plan.id) ? getEmailOffer(plan.id) : null;
    if (emailOffer && emailOffer.amountOffCents >= discount) continue;
    const months = getPlanMonths(plan.id);
    const offerCents = priceCents - discount;
    const fullPrice = formatEuroCents(priceCents);
    prices[plan.id] = {
      offerPrice: formatEuroCents(offerCents),
      fullPrice,
      terms: blackFridayTerms(months, fullPrice),
      price: formatEuroCents(offerCents).replace(" €", "€"),
      perDay: perDayLabel(offerCents, months),
    };
  }
  return { prices };
}
