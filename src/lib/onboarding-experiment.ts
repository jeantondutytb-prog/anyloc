/**
 * A/B test of the onboarding: half of the visitors get the app sandbox
 * (current flow), the other half the previous 2-step flow (destination, then
 * preview). The variant is drawn once in the proxy and kept in a cookie so a
 * visitor always sees the same onboarding.
 */
export const ONBOARDING_VARIANTS = ["app_sandbox", "two_step"] as const;

export type OnboardingVariant = (typeof ONBOARDING_VARIANTS)[number];

export const ONBOARDING_VARIANT_COOKIE = "anyloc-onboarding-variant";

/** 90 days: long enough to cover the visit that ends in a purchase. */
export const ONBOARDING_VARIANT_MAX_AGE = 60 * 60 * 24 * 90;

export function parseOnboardingVariant(value: unknown): OnboardingVariant | null {
  return ONBOARDING_VARIANTS.find((variant) => variant === value) ?? null;
}

export function pickOnboardingVariant(random = Math.random()): OnboardingVariant {
  return random < 0.5 ? "app_sandbox" : "two_step";
}

/** Variant of this browser, read from the cookie set by the proxy. */
export function readOnboardingVariantCookie(): OnboardingVariant | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${ONBOARDING_VARIANT_COOKIE}=([^;]*)`)
  );
  return parseOnboardingVariant(match?.[1]);
}
