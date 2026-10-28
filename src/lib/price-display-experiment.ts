import type { Plan } from "@/lib/constants";

/**
 * A/B test of how the checkout shows each plan's price: half of the visitors
 * keep the price per day (0,22 €/jour), the other half get the price per
 * month (6,99 €/mois). The billed total stays under it in both. Drawn once in
 * the proxy and kept in a cookie, like the pricing test, and read on
 * checkout_continue_clicked and purchase_completed through the
 * price_display_variant person property.
 */
export const PRICE_DISPLAY_VARIANTS = ["per_day", "per_month"] as const;

export type PriceDisplayVariant = (typeof PRICE_DISPLAY_VARIANTS)[number];

export const PRICE_DISPLAY_COOKIE = "anyloc-price-display";

/** 90 days: long enough to cover the visit that ends in a purchase. */
export const PRICE_DISPLAY_MAX_AGE = 60 * 60 * 24 * 90;

export function parsePriceDisplayVariant(value: unknown): PriceDisplayVariant | null {
  return PRICE_DISPLAY_VARIANTS.find((variant) => variant === value) ?? null;
}

export function pickPriceDisplayVariant(random = Math.random()): PriceDisplayVariant {
  return random < 0.5 ? "per_day" : "per_month";
}

/** Months covered by one payment of each plan. */
const PLAN_MONTHS: Record<string, number> = {
  monthly: 1,
  "6months": 6,
  annual: 12,
  month_v2: 1,
  quarter_v2: 3,
  year_v2: 12,
};

/**
 * Rounds up to the next price ending in ,49 or ,99: 6,58 -> 6,99, 4,08 ->
 * 4,49. Never below the real monthly cost, and the euro digit read first
 * stays the same.
 */
export function roundUpToCharmPrice(amount: number) {
  const cents = Math.round(amount * 100);
  const euros = Math.floor(cents / 100);
  const candidates = [euros * 100 + 49, euros * 100 + 99, euros * 100 + 149];
  return candidates.find((candidate) => candidate >= cents)! / 100;
}

function formatEuros(amount: number) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(".", ",");
}

/**
 * The plan's price per month as shown in the per_month variant, without the
 * unit: the billed price for a monthly plan ("9,90", "19"), else the monthly
 * cost rounded up to a charm price ("6,99").
 */
export function getMonthlyDisplayPrice(plan: Pick<Plan, "id" | "price">) {
  const total = Number(plan.price.replace("€", "").replace(",", ".").trim());
  const months = PLAN_MONTHS[plan.id] ?? 1;
  return formatEuros(months === 1 ? total : roundUpToCharmPrice(total / months));
}
