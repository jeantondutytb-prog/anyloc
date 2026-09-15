export const TRIAL_DURATION_MS = 60 * 60 * 1000;

export const TRIAL_DURATION_MINUTES = 60;

export const TRIAL_HEADLINE =
  "Essai gratuit — ta carte est enregistrée, aucun prélèvement avant la fin de l'essai.";

export const TRIAL_CHECKOUT_SUBTITLE =
  "0 € maintenant · débit automatique à la fin de l'essai sauf si tu annules avant.";

/** CTA principal : verbe d'action, meilleure conversion que le nominal. */
export const TRIAL_CTA_LABEL = "Essayer gratuitement";

/** Header et espaces restreints. */
export const TRIAL_CTA_LABEL_SHORT = "Essai gratuit";

export const TRIAL_CTA_SUBLINE =
  "0 € maintenant · carte requise · annule quand tu veux";

export const TRIAL_MARKETING_LINE =
  "Essaie Anyloc gratuitement sur le plan de ton choix — Snap, Insta, Tinder et toutes tes apps.";

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

export function isTrialEndInFuture(trialEndsAt: string | null | undefined) {
  if (!trialEndsAt) {
    return false;
  }

  return new Date(trialEndsAt).getTime() > Date.now();
}

export function isCancelledTrialStatus(status: TrialStatus | null | undefined) {
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

  const trialFields: TrialProfileFields = {
    trial_status: profile.trial_status ?? null,
    trial_ends_at: profile.trial_ends_at ?? null,
    trial_started_at: null,
    trial_payment_method_id: null,
  };

  return (
    isActiveTrial(trialFields) ||
    isStripeTrialingStatus(profile.subscription_status) ||
    (profile.trial_status === "active" && isTrialEndInFuture(profile.trial_ends_at))
  );
}

export function unixToIso(unixSeconds: number | null | undefined) {
  if (!unixSeconds) {
    return null;
  }

  return new Date(unixSeconds * 1000).toISOString();
}
