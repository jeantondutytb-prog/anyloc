const CURRENT_STATUSES = new Set(["active", "trialing"]);

/** Plans paid once (see isOneTimePlanId in constants; kept here to stay import-free). */
const LIFETIME_PLAN_IDS = new Set(["lifetime"]);

/**
 * A customer can hold several Stripe subscriptions (e.g. an unpaid one, then a
 * new paid one). An event about another, no-longer-current subscription — like
 * the enforce-paid cron canceling the unpaid one — must not overwrite the
 * profile's paid subscription and cut the customer's access.
 */
export function isStaleSubscriptionEvent(
  profile: {
    stripe_subscription_id: string | null;
    subscription_status: string | null;
    plan_id?: string | null;
  } | null,
  subscription: { id: string; status: string }
) {
  if (CURRENT_STATUSES.has(subscription.status)) {
    return false;
  }

  // A lifetime customer has no subscription: an event about an old one (e.g.
  // its cancellation ending) must not close the access paid for life.
  if (
    profile?.plan_id &&
    LIFETIME_PLAN_IDS.has(profile.plan_id) &&
    CURRENT_STATUSES.has(profile.subscription_status ?? "")
  ) {
    return true;
  }

  return Boolean(
    profile?.stripe_subscription_id &&
      profile.stripe_subscription_id !== subscription.id &&
      CURRENT_STATUSES.has(profile.subscription_status ?? "")
  );
}
