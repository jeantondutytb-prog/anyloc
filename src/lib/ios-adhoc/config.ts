import type { SubscriptionAccess } from "@/lib/subscription";

export const IOS_ADHOC_BUNDLE_ID = "io.anyloc.app";

/** Plans qui incluent l'app iPhone (la « formule 1 an »). */
export const IOS_ADHOC_ELIGIBLE_PLANS = new Set(["annual", "admin", "clipper"]);

/** Apple : 100 iPhones par compte et par année d'adhésion — 5 gardés pour les tests. */
export const IOS_ADHOC_ACCOUNT_DEVICE_LIMIT = 95;

export const IOS_ADHOC_ENROLLMENT_TTL_MS = 30 * 60 * 1000;
export const IOS_ADHOC_BUILD_STALE_MS = 45 * 60 * 1000;
export const IOS_ADHOC_FAILED_BUILD_BACKOFF_MS = 2 * 60 * 1000;
export const IOS_ADHOC_INSTALL_LINK_TTL_MS = 60 * 60 * 1000;

type EligibilityInput = Pick<SubscriptionAccess, "hasAccess" | "planId" | "isTrial">;

export function isEligibleForIosAdhoc(access: EligibilityInput | null) {
  return Boolean(
    access?.hasAccess &&
      !access.isTrial &&
      access.planId &&
      IOS_ADHOC_ELIGIBLE_PLANS.has(access.planId)
  );
}
