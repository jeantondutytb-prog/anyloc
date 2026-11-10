import { getGridPlans, getPlanGrid, isValidPlanId, PLANS } from "@/lib/constants";

/**
 * Offre annuelle de sortie : l'annuel de la grille v1 à 29 € au lieu de 49 €,
 * à vie, proposée une fois quand on quitte le paywall, ouverte 2 h.
 * Client-safe : la partie Stripe et la lecture serveur sont ailleurs.
 */

/** How long after the first display the annual offer stays open. */
export const ANNUAL_EXIT_OFFER_WINDOW_MS = 2 * 60 * 60 * 1000;

export const ANNUAL_EXIT_OFFER_COOKIE = "anyloc-annual-exit-offer";

const ANNUAL_EXIT_OFFER_MAX_AGE = 60 * 60 * 24 * 90;

export const ANNUAL_EXIT_OFFER_VARIANTS = ["control", "offer"] as const;

export type AnnualExitOfferVariant = (typeof ANNUAL_EXIT_OFFER_VARIANTS)[number];

export function parseAnnualExitOfferVariant(value: unknown): AnnualExitOfferVariant | null {
  return ANNUAL_EXIT_OFFER_VARIANTS.find((variant) => variant === value) ?? null;
}

/** Below 0,5 the visitor is in the control group, otherwise in the offer group. */
export function pickAnnualExitOfferVariant(random: number): AnnualExitOfferVariant {
  return random < 0.5 ? "control" : "offer";
}

/** This browser's variant, drawn and stored on the first call. */
export function getOrPickAnnualExitOfferVariant(random = Math.random()): AnnualExitOfferVariant {
  const match = document.cookie.match(new RegExp(`(?:^|; )${ANNUAL_EXIT_OFFER_COOKIE}=([^;]*)`));
  const existing = parseAnnualExitOfferVariant(match?.[1]);
  if (existing) return existing;

  const variant = pickAnnualExitOfferVariant(random);
  document.cookie = `${ANNUAL_EXIT_OFFER_COOKIE}=${variant}; path=/; max-age=${ANNUAL_EXIT_OFFER_MAX_AGE}; samesite=lax`;
  return variant;
}

/** "49,00€" -> "49 €", "9,90€" -> "9,90 €": the way the paywall writes whole prices. */
function formatPlanPrice(price: string): string {
  return `${price.replace("€", "").trim().replace(/,00$/, "")} €`;
}

/** Prices shown for each plan that can receive the offer. Only the v1 annual is listed. */
export const ANNUAL_EXIT_OFFERS: Record<string, { offerPrice: string; fullPrice: string }> = {
  annual: { offerPrice: "29 €", fullPrice: formatPlanPrice(PLANS.find((plan) => plan.id === "annual")?.price ?? "") },
};

/**
 * The annual plan of the grid of `planId`, if that grid's annual plan has an
 * exit offer; null for an unknown plan or a grid without one (v2).
 */
export function getAnnualExitOfferPlanId(planId: string): string | null {
  if (!isValidPlanId(planId)) return null;
  const annual = getGridPlans(getPlanGrid(planId)).find((plan) => plan.mobileApp);
  if (!annual) return null;
  return Object.keys(ANNUAL_EXIT_OFFERS).includes(annual.id) ? annual.id : null;
}

export type AnnualExitOfferState = "available" | "expired" | "not_eligible";

/**
 * `startedAt` is the first display of the offer (null before it). A former
 * subscriber never gets it; otherwise it is open until 2 h after `startedAt`.
 */
export function getAnnualExitOfferState(input: {
  startedAt: Date | null;
  hasPastSubscription: boolean;
  now: Date;
}): AnnualExitOfferState {
  if (input.hasPastSubscription) return "not_eligible";
  if (!input.startedAt) return "available";
  return input.now.getTime() >= getAnnualExitOfferExpiry(input.startedAt).getTime() ? "expired" : "available";
}

export function getAnnualExitOfferExpiry(startedAt: Date): Date {
  return new Date(startedAt.getTime() + ANNUAL_EXIT_OFFER_WINDOW_MS);
}

/** "14:05": the offer's end in the visitor's local time. */
export function formatAnnualExitExpiry(expiresAt: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(expiresAt.getHours())}:${pad(expiresAt.getMinutes())}`;
}

export function isAnnualExitOfferEnabled() {
  return process.env.NEXT_PUBLIC_ANNUAL_EXIT_OFFER === "on";
}

/** The start time that counts: the first one ever stored, never a later display. */
export function resolveAnnualExitOfferStart(existing: Date | null, now: Date): Date {
  return existing ?? now;
}
