// Free trials are no longer offered. These helpers only read the trial fields
// that older profiles and Stripe subscriptions may still carry.

export const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

export type TrialStatus = "active" | "converted" | "cancelled" | "charge_failed";

function isActiveTrial(profile: {
  trial_status: TrialStatus | null;
  trial_ends_at: string | null;
}) {
  if (profile.trial_status !== "active" || !profile.trial_ends_at) {
    return false;
  }

  return new Date(profile.trial_ends_at).getTime() > Date.now();
}

function isCancelledTrialStatus(status: TrialStatus | null | undefined) {
  return status === "cancelled" || status === "charge_failed";
}

export function isTrialAccessActive(profile: {
  subscription_status?: string | null;
  trial_status?: TrialStatus | null;
  trial_ends_at?: string | null;
}) {
  if (isCancelledTrialStatus(profile.trial_status ?? null)) {
    return false;
  }

  return (
    isActiveTrial({
      trial_status: profile.trial_status ?? null,
      trial_ends_at: profile.trial_ends_at ?? null,
    }) || profile.subscription_status === "trialing"
  );
}

export function unixToIso(unixSeconds: number | null | undefined) {
  if (!unixSeconds) {
    return null;
  }

  return new Date(unixSeconds * 1000).toISOString();
}
