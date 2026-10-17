import { RECOVERY_COUPON_ID } from "@/lib/checkout-recovery";
import {
  type CloseOfferVariant,
  DECLINE_METADATA_KEY,
  getFirstMonthOfferReason,
  isDeclineOfferCode,
} from "@/lib/checkout-first-month-offer";
import { stripe } from "@/lib/stripe";

/**
 * Stamps the refusal on the checkout session (webhook side). The browser can't
 * see why Stripe's form refused a card, so the payment popup reads it back here.
 */
export async function markCheckoutSessionDeclined(sessionId: string, declineCode: string) {
  if (!stripe || !isDeclineOfferCode(declineCode)) return;
  await stripe.checkout.sessions.update(sessionId, {
    metadata: { [DECLINE_METADATA_KEY]: declineCode },
  });
}

async function getOfferSourceSession(sessionId: string) {
  if (!stripe || !sessionId.startsWith("cs_")) return null;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    declineCode: session.metadata?.[DECLINE_METADATA_KEY],
    planId: session.metadata?.plan_id,
    createdAt: new Date(session.created * 1000),
  };
}

/** Whether this checkout was refused for lack of funds, so the popup can offer the discount. */
export async function isCheckoutSessionDeclined(sessionId: string) {
  const source = await getOfferSourceSession(sessionId);
  return isDeclineOfferCode(source?.declineCode);
}

/**
 * The -50 % coupon for `planId` and why, when the checkout `offerSessionId`
 * really was refused for lack of funds, or closed by the "offer" group.
 */
export async function getFirstMonthOfferCoupon(
  offerSessionId: string,
  planId: string,
  closeOfferVariant: CloseOfferVariant | null
) {
  const source = await getOfferSourceSession(offerSessionId);
  const reason = source
    ? getFirstMonthOfferReason(source, planId, closeOfferVariant, new Date())
    : null;
  return reason ? { couponId: RECOVERY_COUPON_ID, reason } : null;
}
