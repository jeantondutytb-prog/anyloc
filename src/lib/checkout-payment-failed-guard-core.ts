/**
 * Stops a customer whose renewal failed from buying a second subscription.
 *
 * past_due / unpaid / incomplete: the old subscription still exists, so a new
 * checkout would leave it to be charged again by a later retry. The fix is a
 * new card on that subscription (/dashboard/expired), not a second purchase.
 *
 * The profile can lag behind Stripe (missed webhook): before refusing, the
 * subscription is read live, and a buyer whose old subscription has really
 * ended can buy again.
 */

/** Profile statuses that block a new checkout. */
export const PAYMENT_FAILED_STATUSES: ReadonlySet<string> = new Set([
  "past_due",
  "unpaid",
  "incomplete",
]);

/** Stripe statuses of a subscription that can no longer charge anyone. */
const ENDED_STRIPE_STATUSES: ReadonlySet<string> = new Set(["canceled", "incomplete_expired"]);

/** Where the customer fixes the card on the existing subscription. */
export const UPDATE_CARD_PATH = "/dashboard/expired";

export const PAYMENT_FAILED_CHECKOUT_ERROR =
  "Ton dernier paiement n'est pas passé. Mets à jour ta carte pour réactiver ton abonnement, sans en payer un deuxième.";

export const PAYMENT_FAILED_CHECKOUT_CODE = "payment_failed_update_card";

export function isPaymentFailedStatus(status: string | null | undefined) {
  return Boolean(status && PAYMENT_FAILED_STATUSES.has(status));
}

export type CheckoutGuardProfile = {
  subscription_status?: string | null;
  stripe_subscription_id?: string | null;
};

export type PaymentFailedCheckoutDeps = {
  getProfile: (userId: string) => Promise<CheckoutGuardProfile | null>;
  /** Live Stripe status of the subscription. */
  getStripeSubscriptionStatus: (subscriptionId: string) => Promise<string>;
};

export type PaymentFailedCheckoutBlock =
  | { blocked: false }
  | { blocked: true; redirectTo: typeof UPDATE_CARD_PATH };

const ALLOWED: PaymentFailedCheckoutBlock = { blocked: false };
const BLOCKED: PaymentFailedCheckoutBlock = { blocked: true, redirectTo: UPDATE_CARD_PATH };

/**
 * Only profiles in a failed-payment status cost a Stripe call; every other
 * buyer (new, active, cancelled) goes through on the profile alone.
 */
export async function getPaymentFailedCheckoutBlockWith(
  userId: string | null | undefined,
  deps: PaymentFailedCheckoutDeps
): Promise<PaymentFailedCheckoutBlock> {
  if (!userId) {
    return ALLOWED;
  }

  const profile = await deps.getProfile(userId);

  if (!isPaymentFailedStatus(profile?.subscription_status)) {
    return ALLOWED;
  }

  const subscriptionId = profile?.stripe_subscription_id;

  // No subscription on file: nothing could be charged twice.
  if (!subscriptionId) {
    return ALLOWED;
  }

  try {
    const status = await deps.getStripeSubscriptionStatus(subscriptionId);
    return ENDED_STRIPE_STATUSES.has(status) ? ALLOWED : BLOCKED;
  } catch {
    // Unsure whether the old subscription still charges: send to the card fix.
    return BLOCKED;
  }
}
