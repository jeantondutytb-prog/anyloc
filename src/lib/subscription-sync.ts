const CURRENT_STATUSES = new Set(["active", "trialing"]);

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
  } | null,
  subscription: { id: string; status: string }
) {
  if (CURRENT_STATUSES.has(subscription.status)) {
    return false;
  }

  return Boolean(
    profile?.stripe_subscription_id &&
      profile.stripe_subscription_id !== subscription.id &&
      CURRENT_STATUSES.has(profile.subscription_status ?? "")
  );
}
