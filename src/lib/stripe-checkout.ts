import type { User } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { CheckoutButtonVariant } from "@/lib/checkout-button-experiment";
import { CHECKOUT_PAY_CONSENT, DEVICE_REQUIREMENT_NOTE, type Plan } from "@/lib/constants";
import { ensureStripeCustomerForUser } from "@/lib/billing";
import { getAppUrl, stripe } from "@/lib/stripe";
import { UserFacingError } from "@/lib/errors";

// "elements": Stripe Elements on our own page (the Apple Pay button of the
// paywall), paid from the page with checkout.confirm().
type CheckoutMode = "embedded_page" | "hosted_page" | "elements";

/**
 * Tags the session and its subscription with the payment button the buyer
 * saw, so sales can be counted per variant in Stripe.
 */
function withCheckoutButtonVariant(
  params: Stripe.Checkout.SessionCreateParams,
  variant?: CheckoutButtonVariant | null
): Stripe.Checkout.SessionCreateParams {
  if (!variant) {
    return params;
  }

  return {
    ...params,
    metadata: { ...params.metadata, checkout_button_variant: variant },
    subscription_data: {
      ...params.subscription_data,
      metadata: { ...params.subscription_data?.metadata, checkout_button_variant: variant },
    },
  };
}

/**
 * Keeps the browser's PostHog id on the session so the webhook can attribute
 * the purchase to the visit, including when nobody is logged in.
 */
function withAnalyticsId(
  params: Stripe.Checkout.SessionCreateParams,
  analyticsId?: string
): Stripe.Checkout.SessionCreateParams {
  if (!analyticsId) {
    return params;
  }

  return {
    ...params,
    metadata: { ...params.metadata, posthog_distinct_id: analyticsId },
  };
}

/** Device requirement and immediate-access consent, shown above the Stripe pay button. */
function getDeviceRequirementParams(): Pick<
  Stripe.Checkout.SessionCreateParams,
  "custom_text"
> {
  return {
    custom_text: {
      submit: { message: `${DEVICE_REQUIREMENT_NOTE}\n\n${CHECKOUT_PAY_CONSENT}` },
    },
  };
}

function getCheckoutReturnUrl() {
  const appUrl = getAppUrl();
  return `${appUrl}/auth/checkout-complete?session_id={CHECKOUT_SESSION_ID}`;
}

export async function createSubscriptionCheckoutSession({
  plan,
  user,
  uiMode,
  analyticsId,
  couponId,
  checkoutButtonVariant,
}: {
  plan: Plan;
  user?: User | null;
  uiMode: CheckoutMode;
  analyticsId?: string;
  /**
   * Stripe coupon applied up front (e.g. the recovery email offer). May be a
   * pending lookup: it runs alongside the Stripe customer lookup.
   */
  couponId?: string | null | Promise<string | null>;
  /** Payment button A/B test variant of the visitor, when they are part of it. */
  checkoutButtonVariant?: CheckoutButtonVariant | null;
}) {
  if (!stripe || !plan.stripePriceId) {
    throw new UserFacingError("Paiement non configuré pour ce plan");
  }

  const returnUrl = getCheckoutReturnUrl();

  const [baseParams, coupon] = await Promise.all([
    user?.id ? buildAuthenticatedCheckoutParams(plan, user) : buildGuestCheckoutParams(plan),
    couponId,
  ]);

  const taggedParams = withCheckoutButtonVariant(
    withAnalyticsId(baseParams, analyticsId),
    checkoutButtonVariant
  );

  // Elements sessions take no custom_text: the page shows the consent itself.
  if (uiMode === "elements") {
    return stripe.checkout.sessions.create({
      ...taggedParams,
      ...(coupon ? { discounts: [{ coupon }] } : {}),
      ui_mode: "elements",
      return_url: returnUrl,
    });
  }

  const sharedParams = {
    ...taggedParams,
    ...getDeviceRequirementParams(),
    ...(coupon ? { discounts: [{ coupon }] } : {}),
  };

  if (uiMode === "embedded_page") {
    return stripe.checkout.sessions.create({
      ...sharedParams,
      ui_mode: "embedded_page",
      return_url: returnUrl,
    });
  }

  return stripe.checkout.sessions.create({
    ...sharedParams,
    ui_mode: "hosted_page",
    success_url: returnUrl,
    cancel_url: `${getAppUrl()}/checkout?plan=${plan.id}&canceled=true`,
  });
}

async function buildAuthenticatedCheckoutParams(
  plan: Plan,
  user: User
): Promise<Stripe.Checkout.SessionCreateParams> {
  if (!user.email) {
    throw new UserFacingError("Ton compte n'a pas d'email associé.");
  }

  const customerId = await ensureStripeCustomerForUser({
    userId: user.id,
    email: user.email,
  });

  return {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripePriceId!, quantity: 1 }],
    client_reference_id: user.id,
    metadata: {
      supabase_user_id: user.id,
      plan_id: plan.id,
      guest_checkout: "false",
      checkout_type: "direct_subscription",
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        plan_id: plan.id,
        guest_checkout: "false",
      },
    },
    ...(customerId
      ? { customer: customerId }
      : { customer_email: user.email }),
  };
}

function buildGuestCheckoutParams(
  plan: Plan
): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripePriceId!, quantity: 1 }],
    metadata: {
      plan_id: plan.id,
      guest_checkout: "true",
      checkout_type: "direct_subscription",
    },
    subscription_data: {
      metadata: {
        plan_id: plan.id,
        guest_checkout: "true",
      },
    },
  };
}

export async function getAuthenticatedCheckoutUser() {
  const { createClient, isSupabaseConfigured } = await import(
    "@/lib/supabase/server"
  );

  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
