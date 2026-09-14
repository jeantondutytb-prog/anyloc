export const TRIAL_DURATION_MS = 60 * 60 * 1000;

export const TRIAL_DURATION_MINUTES = 60;

export const TRIAL_HEADLINE =
  "Essai gratuit 1 h — ta carte est enregistrée, aucun prélèvement avant la fin de l'essai.";

export const TRIAL_CHECKOUT_SUBTITLE =
  "0 € maintenant · débit automatique à la fin de l'essai sauf si tu annules avant.";

export type TrialStatus = "active" | "converted" | "cancelled" | "charge_failed";

export type TrialProfileFields = {
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_status: TrialStatus | null;
  trial_payment_method_id: string | null;
};

export function isActiveTrial(profile: TrialProfileFields) {
  if (profile.trial_status !== "active" || !profile.trial_ends_at) {
    return false;
  }

  return new Date(profile.trial_ends_at).getTime() > Date.now();
}

export function getTrialRemainingMs(profile: TrialProfileFields) {
  if (!isActiveTrial(profile) || !profile.trial_ends_at) {
    return 0;
  }

  return Math.max(0, new Date(profile.trial_ends_at).getTime() - Date.now());
}

export function formatTrialRemaining(ms: number) {
  const totalMinutes = Math.ceil(ms / (60 * 1000));

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  }

  return `${totalMinutes} min`;
}

export function getTrialEndDate(startedAt = new Date()) {
  return new Date(startedAt.getTime() + TRIAL_DURATION_MS);
}

export function getTrialEndUnix(startedAt = new Date()) {
  return Math.floor(getTrialEndDate(startedAt).getTime() / 1000);
}

export function isStripeTrialingStatus(status: string | null | undefined) {
  return status === "trialing";
}

export function unixToIso(unixSeconds: number | null | undefined) {
  if (!unixSeconds) {
    return null;
  }

  return new Date(unixSeconds * 1000).toISOString();
}
