/**
 * A/B test of the price grid: half of the visitors keep the current plans
 * (9,90 € / 34,90 € / 49 €), the other half get 19 € / 1 mois, 29 € / 3 mois
 * (preselected) and 79 € / 1 an with the iPhone app. The variant is drawn
 * once in the proxy and kept in a cookie so a visitor always sees the same
 * prices. Off until NEXT_PUBLIC_PRICING_EXPERIMENT is "on" (the v2 Stripe
 * prices must exist first): everyone then gets the current grid.
 */
export const PRICING_VARIANTS = ["control", "grid_v2"] as const;

export type PricingVariant = (typeof PRICING_VARIANTS)[number];

export const PRICING_VARIANT_COOKIE = "anyloc-pricing-variant";

/** 90 days: long enough to cover the visit that ends in a purchase. */
export const PRICING_VARIANT_MAX_AGE = 60 * 60 * 24 * 90;

export function isPricingExperimentEnabled() {
  return process.env.NEXT_PUBLIC_PRICING_EXPERIMENT === "on";
}

export function parsePricingVariant(value: unknown): PricingVariant | null {
  return PRICING_VARIANTS.find((variant) => variant === value) ?? null;
}

export function pickPricingVariant(random = Math.random()): PricingVariant {
  return random < 0.5 ? "control" : "grid_v2";
}

/** The variant to render: always the current grid while the test is off. */
export function getEffectivePricingVariant(cookieValue: unknown): PricingVariant {
  return isPricingExperimentEnabled() && parsePricingVariant(cookieValue) === "grid_v2"
    ? "grid_v2"
    : "control";
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
// "annual"): the checkout translates them into the visitor's grid. The
// default "annual" lands on the preselected 3-month plan of the new grid.
const TO_GRID_V2: Record<string, string> = {
  monthly: "month_v2",
  "6months": "quarter_v2",
  annual: "quarter_v2",
};

const TO_CONTROL: Record<string, string> = {
  month_v2: "monthly",
  quarter_v2: "6months",
  year_v2: "annual",
};

export function planIdForVariant(planId: string, variant: PricingVariant) {
  const mapping = variant === "grid_v2" ? TO_GRID_V2 : TO_CONTROL;
  return mapping[planId] ?? planId;
}
