import type { PricingGrid } from "@/lib/constants";

/**
 * A/B test of the price grid: half of the visitors keep the current plans
 * (9,90 € / 34,90 € / 49 €), the other half get 9,90 € / mois, 49 € / an and
 * 89 € à vie (paid once, computer only), in place of the 6-month plan that no
 * longer sells. The variant is drawn once in the proxy and kept in a cookie so
 * a visitor always sees the same prices. Off until
 * NEXT_PUBLIC_PRICING_EXPERIMENT is "on" (STRIPE_PRICE_LIFETIME must exist
 * first): everyone then gets the current grid.
 *
 * The previous test (19 € / 29 € / 79 €, "grid_v2") lost and was stopped on
 * 27/10. Its plans stay in PLANS for the subscribers who bought them; the
 * cookie was renamed so every visitor is drawn again for this test.
 */
export const PRICING_VARIANTS = ["control", "lifetime"] as const;

export type PricingVariant = (typeof PRICING_VARIANTS)[number];

export const PRICING_VARIANT_COOKIE = "anyloc-pricing-variant-v3";

/** 90 days: long enough to cover the visit that ends in a purchase. */
export const PRICING_VARIANT_MAX_AGE = 60 * 60 * 24 * 90;

export function isPricingExperimentEnabled() {
  return process.env.NEXT_PUBLIC_PRICING_EXPERIMENT === "on";
}

export function parsePricingVariant(value: unknown): PricingVariant | null {
  return PRICING_VARIANTS.find((variant) => variant === value) ?? null;
}

export function pickPricingVariant(random = Math.random()): PricingVariant {
  return random < 0.5 ? "control" : "lifetime";
}

/** The variant to render: always the current grid while the test is off. */
export function getEffectivePricingVariant(cookieValue: unknown): PricingVariant {
  return isPricingExperimentEnabled() && parsePricingVariant(cookieValue) === "lifetime"
    ? "lifetime"
    : "control";
}

/** The plans grid a variant shows. */
export function getPricingGrid(variant: PricingVariant): PricingGrid {
  return variant === "lifetime" ? "v3" : "v1";
}

/** Variant of this browser, read from the cookie set by the proxy. */
export function readPricingVariantCookie(): PricingVariant {
  if (typeof document === "undefined") {
    return "control";
  }

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${PRICING_VARIANT_COOKIE}=([^;]*)`)
  );
  return getEffectivePricingVariant(match?.[1]);
}

// Links across the site carry current-grid plan ids (the landing CTAs pass
// "monthly" or "annual"): the checkout translates them into the visitor's
// grid. Ids of the stopped v2 grid are sent to their closest plan.
const TO_LIFETIME_GRID: Record<string, string> = {
  monthly: "monthly_v3",
  "6months": "annual_v3",
  annual: "annual_v3",
  month_v2: "monthly_v3",
  quarter_v2: "annual_v3",
  year_v2: "annual_v3",
};

const TO_CONTROL: Record<string, string> = {
  month_v2: "monthly",
  quarter_v2: "6months",
  year_v2: "annual",
  monthly_v3: "monthly",
  annual_v3: "annual",
  lifetime: "annual",
};

export function planIdForVariant(planId: string, variant: PricingVariant) {
  const mapping = variant === "lifetime" ? TO_LIFETIME_GRID : TO_CONTROL;
  return mapping[planId] ?? planId;
}
