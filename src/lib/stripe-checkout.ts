import type { User } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { DEVICE_REQUIREMENT_NOTE, type Plan } from "@/lib/constants";
import { ensureStripeCustomerForUser } from "@/lib/billing";
import { getAppUrl, stripe } from "@/lib/stripe";

type CheckoutMode = "embedded_page" | "hosted_page";

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

/**
 * Mandatory checkbox in the Stripe form: the buyer asks for immediate access
 * and waives the 14-day withdrawal right (art. L221-28 13° code de la consommation).
 * Stripe records the acceptance on the session (`consent.terms_of_service`).
 * Requires a Terms of Service URL in Stripe Dashboard → Settings → Public details.
 */
function getWithdrawalWaiverParams(): Pick<
  Stripe.Checkout.SessionCreateParams,
  "consent_collection" | "custom_text"
> {
  const appUrl = getAppUrl();
  return {
    consent_collection: { terms_of_service: "required" },
    custom_text: {
      terms_of_service_acceptance: {
        message: `J'accepte les [conditions générales](${appUrl}/conditions-generales) et je demande l'accès immédiat au service. Je renonce expressément à mon droit de rétractation de 14 jours : aucun remboursement une fois l'accès débloqué ([politique de remboursement](${appUrl}/politique-de-remboursement)).`,
      },
      submit: { message: DEVICE_REQUIREMENT_NOTE },
    },
  };
}

function getCheckoutReturnUrl() {
  const appUrl = getAppUrl();
  return `${appUrl}/auth/checkout-complete?session_id={CHECKOUT_SESSION_ID}`;
}

export async function createTrialSetupCheckoutSession({
  plan,
  user,
  uiMode,
  analyticsId,
}: {
  plan: Plan;
  user?: User | null;
  uiMode: CheckoutMode;
  analyticsId?: string;
}) {
  if (!stripe || !plan.stripePriceId) {
    throw new Error("Paiement non configuré pour ce plan");
  }

  const returnUrl = getCheckoutReturnUrl();

  const sharedParams = withAnalyticsId(
    user?.id
      ? await buildAuthenticatedTrialSetupParams(plan, user)
      : buildGuestTrialSetupParams(plan),
    analyticsId
  );

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

async function buildAuthenticatedTrialSetupParams(
  plan: Plan,
  user: User
): Promise<Stripe.Checkout.SessionCreateParams> {
  if (!user.email) {
    throw new Error("Ton compte n'a pas d'email associé.");
  }

  const customerId = await ensureStripeCustomerForUser({
    userId: user.id,
    email: user.email,
  });

  return {
    mode: "setup",
    payment_method_types: ["card"],
    client_reference_id: user.id,
    metadata: {
      supabase_user_id: user.id,
      plan_id: plan.id,
      guest_checkout: "false",
      checkout_type: "trial_setup",
    },
    ...(customerId
      ? { customer: customerId }
      : { customer_email: user.email }),
  };
}

function buildGuestTrialSetupParams(
  plan: Plan
): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "setup",
    payment_method_types: ["card"],
    metadata: {
      plan_id: plan.id,
      guest_checkout: "true",
      checkout_type: "trial_setup",
    },
  };
}

export async function createSubscriptionCheckoutSession({
  plan,
  user,
  uiMode,
  analyticsId,
}: {
  plan: Plan;
  user?: User | null;
  uiMode: CheckoutMode;
  analyticsId?: string;
}) {
  if (!stripe || !plan.stripePriceId) {
    throw new Error("Paiement non configuré pour ce plan");
  }

  const returnUrl = getCheckoutReturnUrl();

  const sharedParams = {
    ...withAnalyticsId(
      user?.id
        ? await buildAuthenticatedCheckoutParams(plan, user)
        : buildGuestCheckoutParams(plan),
      analyticsId
    ),
    ...getWithdrawalWaiverParams(),
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
    throw new Error("Ton compte n'a pas d'email associé.");
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
