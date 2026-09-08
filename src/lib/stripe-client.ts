export function getStripePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ??
    process.env.STRIPE_PUBLIC_KEY ??
    ""
  );
}
