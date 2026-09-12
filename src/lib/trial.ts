/** Durée de l'essai gratuit (en secondes). */
export const FREE_TRIAL_SECONDS = 24 * 60 * 60;

export const FREE_TRIAL_HOURS = FREE_TRIAL_SECONDS / (60 * 60);

export const FREE_TRIAL_LABEL = `${FREE_TRIAL_HOURS} h`;

export function getStripeTrialEndUnix() {
  return Math.floor(Date.now() / 1000) + FREE_TRIAL_SECONDS;
}

export function getTrialCtaLabel() {
  return `Essayer ${FREE_TRIAL_LABEL} gratuitement`;
}

export function getTrialCtaShortLabel() {
  return `Essai ${FREE_TRIAL_LABEL} gratuit`;
}

export function getTrialBillingNote(planPrice: string, planPeriod: string) {
  return `Puis ${planPrice}${planPeriod}. Annule avant la fin de l'essai = 0 €.`;
}
