/**
 * A/B test of the onboarding: half of the visitors keep the current flow
 * (destination, teleport preview, then signup), the other half sign up first,
 * then pick a destination and answer a few questions while their position
 * "gets ready", before a paywall that recommends a plan from their answers.
 * Drawn once in the proxy and kept in a cookie, like the pricing test. Off
 * until NEXT_PUBLIC_ONBOARDING_EXPERIMENT is "on": everyone then keeps the
 * current flow.
 */
export const ONBOARDING_VARIANTS = ["control", "quiz"] as const;

export type OnboardingVariant = (typeof ONBOARDING_VARIANTS)[number];

export const ONBOARDING_VARIANT_COOKIE = "anyloc-onboarding-variant";

/** 90 days: long enough to cover the visit that ends in a purchase. */
export const ONBOARDING_VARIANT_MAX_AGE = 60 * 60 * 24 * 90;

export const ONBOARDING_QUIZ_PATH = "/onboarding/quiz";

export function isOnboardingExperimentEnabled() {
  return process.env.NEXT_PUBLIC_ONBOARDING_EXPERIMENT === "on";
}

export function parseOnboardingVariant(value: unknown): OnboardingVariant | null {
  return ONBOARDING_VARIANTS.find((variant) => variant === value) ?? null;
}

export function pickOnboardingVariant(random = Math.random()): OnboardingVariant {
  return random < 0.5 ? "control" : "quiz";
}

/** The flow to run: always the current one while the test is off. */
export function getEffectiveOnboardingVariant(cookieValue: unknown): OnboardingVariant {
  return isOnboardingExperimentEnabled() && parseOnboardingVariant(cookieValue) === "quiz"
    ? "quiz"
    : "control";
}

export function getOnboardingQuizUrl(planId: string) {
  return `${ONBOARDING_QUIZ_PATH}?plan=${planId}`;
}

/** Signup first, then the quiz: where the quiz half of the landing CTAs go. */
export function getQuizSignupUrl(planId: string) {
  return `/signup?plan=${planId}&next=${encodeURIComponent(getOnboardingQuizUrl(planId))}`;
}

export function isOnboardingQuizPath(path: string | null | undefined) {
  return (path ?? "").split("?")[0] === ONBOARDING_QUIZ_PATH;
}
