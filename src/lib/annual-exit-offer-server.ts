import {
  getAnnualExitOfferExpiry,
  getAnnualExitOfferState,
  resolveAnnualExitOfferStart,
} from "@/lib/annual-exit-offer";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSubscriptionInactiveReason } from "@/lib/subscription-inactive";

/** Stripe coupon of the annual exit offer (29 € forever). Unset: the offer is off. */
export const ANNUAL_EXIT_COUPON_ID: string | null = process.env.STRIPE_COUPON_ANNUAL_EXIT ?? null;

const PROFILE_COLUMNS =
  "subscription_status, trial_status, trial_ends_at, plan_id, annual_exit_offer_started_at";

async function readOfferProfile(userId: string) {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function toStartedAt(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

/**
 * Starts the 2 h window on the first display and returns when it ends, or
 * null when the offer is not (or no longer) available. A second call never
 * moves the start time: the write only lands while the column is still empty,
 * and the stored value is read back so that two concurrent calls agree.
 */
export async function startAnnualExitOffer(
  userId: string,
  now: Date = new Date()
): Promise<{ expiresAt: Date } | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const profile = await readOfferProfile(userId);
  if (!profile) return null;

  const hasPastSubscription = getSubscriptionInactiveReason(profile) !== "no_subscription";
  let startedAt = toStartedAt(profile.annual_exit_offer_started_at);

  if (!startedAt && !hasPastSubscription) {
    const { error } = await createAdminClient()
      .from("profiles")
      .update({ annual_exit_offer_started_at: resolveAnnualExitOfferStart(null, now).toISOString() })
      .eq("id", userId)
      .is("annual_exit_offer_started_at", null);
    if (error) throw error;

    // The winner of a race may be another call: trust what is stored.
    startedAt = toStartedAt((await readOfferProfile(userId))?.annual_exit_offer_started_at);
  }

  if (!startedAt) return null;
  if (getAnnualExitOfferState({ startedAt, hasPastSubscription, now }) !== "available") return null;
  return { expiresAt: getAnnualExitOfferExpiry(startedAt) };
}

/** The coupon for an annual checkout while the offer is open; otherwise null. */
export async function getAnnualExitOfferCoupon(
  userId: string,
  planId: string,
  now: Date = new Date()
): Promise<string | null> {
  if (!ANNUAL_EXIT_COUPON_ID || planId !== "annual" || !isSupabaseAdminConfigured()) return null;

  const profile = await readOfferProfile(userId);
  const startedAt = toStartedAt(profile?.annual_exit_offer_started_at);
  if (!profile || !startedAt) return null;

  const state = getAnnualExitOfferState({
    startedAt,
    hasPastSubscription: getSubscriptionInactiveReason(profile) !== "no_subscription",
    now,
  });
  return state === "available" ? ANNUAL_EXIT_COUPON_ID : null;
}
