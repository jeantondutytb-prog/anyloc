import { getCheckoutUrl, getPlanDisplayName, isValidPlanId } from "@/lib/constants";
import type { TrialStatus } from "@/lib/trial";
import { isActiveSubscriptionStatus } from "@/lib/subscription";

export type SubscriptionInactiveReason =
  | "payment_failed"
  | "trial_cancelled"
  | "ended"
  | "trial_ended"
  | "no_subscription";

export type SubscriptionInactiveDetails = {
  reason: SubscriptionInactiveReason;
  title: string;
  description: string;
  ctaLabel: string;
  checkoutUrl: string;
  previousPlanName: string | null;
};

export type SubscriptionInactivePayload = SubscriptionInactiveDetails & {
  pricingUrl: string;
  expiredUrl: string;
  supportEmail: string;
};

export function toSubscriptionInactivePayload(
  details: SubscriptionInactiveDetails,
  siteUrl: string
): SubscriptionInactivePayload {
  const origin = siteUrl.replace(/\/$/, "");

  return {
    ...details,
    checkoutUrl: details.checkoutUrl.startsWith("http")
      ? details.checkoutUrl
      : `${origin}${details.checkoutUrl}`,
    pricingUrl: `${origin}/pricing`,
    expiredUrl: `${origin}${SUBSCRIPTION_EXPIRED_PATH}`,
    supportEmail: "support@anyloc.io",
  };
}

type ProfileInactiveFields = {
  subscription_status?: string | null;
  trial_status?: TrialStatus | null;
  trial_ends_at?: string | null;
  plan_id?: string | null;
};

const PAYMENT_FAILED_STATUSES = new Set(["past_due", "unpaid", "incomplete"]);

const REASON_COPY: Record<
  SubscriptionInactiveReason,
  Pick<SubscriptionInactiveDetails, "title" | "description" | "ctaLabel">
> = {
  payment_failed: {
    title: "Paiement refusé",
    description:
      "Ton dernier prélèvement n'a pas abouti. Ton accès Anyloc est suspendu. Reprends un abonnement pour revenir sur Snap, Insta et toutes tes apps.",
    ctaLabel: "Reprendre mon abonnement",
  },
  trial_cancelled: {
    title: "Essai annulé",
    description:
      "Tu as annulé ton essai gratuit avant le débit. Tu peux reprendre quand tu veux.",
    ctaLabel: "Voir les offres",
  },
  ended: {
    title: "Abonnement terminé",
    description:
      "Ton abonnement n'est plus actif. Reprends une formule pour retrouver l'accès complet.",
    ctaLabel: "Reprendre mon abonnement",
  },
  trial_ended: {
    title: "Essai terminé",
    description:
      "Ton essai gratuit d'une heure est fini et tu n'as plus d'accès actif. Choisis une formule pour continuer.",
    ctaLabel: "Choisir une formule",
  },
  no_subscription: {
    title: "Abonnement requis",
    description:
      "Tu n'as pas encore d'abonnement actif. Choisis une formule pour débloquer Anyloc.",
    ctaLabel: "Voir les offres",
  },
};

export function getSubscriptionInactiveReason(
  profile: ProfileInactiveFields
): SubscriptionInactiveReason {
  const subscriptionStatus = profile.subscription_status ?? null;
  const trialStatus = profile.trial_status ?? null;
  const trialEndsAt = profile.trial_ends_at ?? null;
  const trialEnded =
    trialEndsAt !== null && new Date(trialEndsAt).getTime() <= Date.now();

  if (
    trialStatus === "charge_failed" ||
    (subscriptionStatus && PAYMENT_FAILED_STATUSES.has(subscriptionStatus))
  ) {
    return "payment_failed";
  }

  if (trialStatus === "cancelled") {
    return "trial_cancelled";
  }

  if (trialEnded && !isActiveSubscriptionStatus(subscriptionStatus)) {
    if (trialStatus === "converted") {
      return "payment_failed";
    }

    return "trial_ended";
  }

  if (subscriptionStatus === "canceled") {
    return "ended";
  }

  if (!subscriptionStatus && !profile.plan_id) {
    return "no_subscription";
  }

  return "no_subscription";
}

export function getSubscriptionInactiveDetails(
  profile: ProfileInactiveFields
): SubscriptionInactiveDetails {
  const reason = getSubscriptionInactiveReason(profile);
  const copy = REASON_COPY[reason];
  const checkoutPlanId = isValidPlanId(profile.plan_id ?? undefined)
    ? profile.plan_id!
    : "annual";

  return {
    reason,
    ...copy,
    checkoutUrl: getCheckoutUrl(checkoutPlanId),
    previousPlanName: getPlanDisplayName(profile.plan_id ?? null),
  };
}

export const SUBSCRIPTION_EXPIRED_PATH = "/dashboard/expired";
