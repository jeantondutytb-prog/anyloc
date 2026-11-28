import { getBlackFridayCouponId, getPaywallBlackFriday, type PaywallBlackFriday } from "@/lib/black-friday";
import { EMAIL_OFFERS } from "@/lib/checkout-email-offer";
import { RECOVERY_OFFER_PLAN_ID } from "@/lib/checkout-recovery-plan";
import { getActiveEmailOfferEnd, getActiveRecoveryOfferExpiry } from "@/lib/checkout-recovery-server";

/**
 * The Black Friday prices of a logged-in visitor's paywall, outside /checkout
 * (the quiz's plan sheet): the inputs /checkout uses, read without starting
 * any offer. The -50 % welcome offer, while it runs, wins over the email's
 * discount, which wins over nothing: same order as /checkout.
 */
export async function getPaywallBlackFridayForUser(
  userId: string,
  now: Date = new Date()
): Promise<PaywallBlackFriday | null> {
  const couponId = getBlackFridayCouponId();
  // Off: no lookup at all.
  if (!getPaywallBlackFriday({ now, couponId })) return null;

  const welcomeOfferEnd = await getActiveRecoveryOfferExpiry(userId).catch(() => null);
  const emailOfferEnd = welcomeOfferEnd ? null : await getActiveEmailOfferEnd(userId).catch(() => null);

  return getPaywallBlackFriday({
    now,
    couponId,
    welcomeOfferPlanId: welcomeOfferEnd ? RECOVERY_OFFER_PLAN_ID : null,
    emailOfferPlanIds: emailOfferEnd ? Object.keys(EMAIL_OFFERS) : [],
  });
}
