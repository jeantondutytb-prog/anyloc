import { getPostOnboardingSignupUrl } from "@/lib/constants";

/**
 * A/B test of the onboarding: half of the visitors keep the current flow
 * (destination, teleport preview, then signup and checkout), the other half
 * sign up first and answer the quiz (/onboarding/quiz) before the paywall.
 * Drawn once in the proxy and kept in a cookie, like the pricing test. Off
 * until NEXT_PUBLIC_ONBOARDING_EXPERIMENT is "on": everyone then keeps the
 * current flow.
 *
 * The "app" variant (web remote, /app) is retired but /app stays reachable.
 * Visitors who still carry an "app" or "quiz" cookie get drawn again.
 */
export const ONBOARDING_VARIANTS = ["control", "questions"] as const;

export type OnboardingVariant = (typeof ONBOARDING_VARIANTS)[number];

export const ONBOARDING_VARIANT_COOKIE = "anyloc-onboarding-variant";

/** 90 days: long enough to cover the visit that ends in a purchase. */
export const ONBOARDING_VARIANT_MAX_AGE = 60 * 60 * 24 * 90;

export const ONBOARDING_QUIZ_PATH = "/onboarding/quiz";

export const REMOTE_APP_PATH = "/app";

export function isOnboardingExperimentEnabled() {
  return process.env.NEXT_PUBLIC_ONBOARDING_EXPERIMENT === "on";
}

export function parseOnboardingVariant(value: unknown): OnboardingVariant | null {
  return ONBOARDING_VARIANTS.find((variant) => variant === value) ?? null;
}

export function pickOnboardingVariant(random = Math.random()): OnboardingVariant {
  return random < 0.5 ? "control" : "questions";
}

/** The flow to run: always the current one while the test is off. */
export function getEffectiveOnboardingVariant(cookieValue: unknown): OnboardingVariant {
  return isOnboardingExperimentEnabled() && parseOnboardingVariant(cookieValue) === "questions"
    ? "questions"
    : "control";
}

export function getOnboardingQuizUrl(planId: string) {
  return `${ONBOARDING_QUIZ_PATH}?plan=${planId}`;
}

/** Signup first, then the quiz. */
export function getQuizSignupUrl(planId: string) {
  return `/signup?plan=${planId}&next=${encodeURIComponent(getOnboardingQuizUrl(planId))}`;
}

export function isOnboardingQuizPath(path: string | null | undefined) {
  return (path ?? "").split("?")[0] === ONBOARDING_QUIZ_PATH;
}

/** Where the visitor goes to sign up, depending on the half of the test. */
export function getSignupUrlForOnboardingVariant(variant: OnboardingVariant, planId: string) {
  return variant === "questions"
    ? getQuizSignupUrl(planId)
    : getPostOnboardingSignupUrl(planId);
}

/** Signup first, then the web remote: where the app half of the landing CTAs go. */
export function getAppSignupUrl(planId: string) {
  return `/signup?plan=${planId}&next=${encodeURIComponent(REMOTE_APP_PATH)}`;
}

export function isRemoteAppPath(path: string | null | undefined) {
  return (path ?? "").split("?")[0] === REMOTE_APP_PATH;
}
