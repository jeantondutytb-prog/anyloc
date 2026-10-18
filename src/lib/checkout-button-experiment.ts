/**
 * A/B test of the paywall's payment button: half of the visitors keep the
 * gradient "Débloquer" button that opens the payment popup, the other half get
 * a native Apple Pay button right under the plans (no popup, Face ID and done)
 * with "Continuer" as a secondary way to pay by card. The variant is drawn once
 * in the proxy, separately from the pricing test, and kept in a cookie. Off
 * until NEXT_PUBLIC_CHECKOUT_BUTTON_EXPERIMENT is "on": everyone then gets the
 * current button.
 */
export const CHECKOUT_BUTTON_VARIANTS = ["control", "apple_pay_direct"] as const;

export type CheckoutButtonVariant = (typeof CHECKOUT_BUTTON_VARIANTS)[number];

export const CHECKOUT_BUTTON_VARIANT_COOKIE = "anyloc-checkout-button-variant";

/** 90 days: long enough to cover the visit that ends in a purchase. */
export const CHECKOUT_BUTTON_VARIANT_MAX_AGE = 60 * 60 * 24 * 90;

export function isCheckoutButtonExperimentEnabled() {
  return process.env.NEXT_PUBLIC_CHECKOUT_BUTTON_EXPERIMENT === "on";
}

export function parseCheckoutButtonVariant(value: unknown): CheckoutButtonVariant | null {
  return CHECKOUT_BUTTON_VARIANTS.find((variant) => variant === value) ?? null;
}

export function pickCheckoutButtonVariant(random = Math.random()): CheckoutButtonVariant {
  return random < 0.5 ? "control" : "apple_pay_direct";
}

/** The variant to render: always the current button while the test is off. */
export function getEffectiveCheckoutButtonVariant(cookieValue: unknown): CheckoutButtonVariant {
  return isCheckoutButtonExperimentEnabled() &&
    parseCheckoutButtonVariant(cookieValue) === "apple_pay_direct"
    ? "apple_pay_direct"
    : "control";
}
