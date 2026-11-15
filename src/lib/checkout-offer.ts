import type Stripe from "stripe";

/** Tag of a session paid with the annual exit offer (29 € for life). */
export const CHECKOUT_OFFER_ANNUAL_EXIT = "annual_exit";

/**
 * Tags the session and its subscription with the offer, so that the webhook
 * analytics and Stripe reports can tell the discounted purchases apart.
 * No offer: the params come back untouched.
 */
export function withCheckoutOffer(
  params: Stripe.Checkout.SessionCreateParams,
  offer: string | null
): Stripe.Checkout.SessionCreateParams {
  if (!offer) return params;

  return {
    ...params,
    metadata: { ...params.metadata, offer },
    subscription_data: {
      ...params.subscription_data,
      metadata: { ...params.subscription_data?.metadata, offer },
    },
  };
}
