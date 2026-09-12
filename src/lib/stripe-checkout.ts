import type { User } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { Plan } from "@/lib/constants";
import { ensureStripeCustomerForUser } from "@/lib/billing";
import { getAppUrl, stripe } from "@/lib/stripe";

type CheckoutMode = "embedded_page" | "hosted_page";

function getCheckoutReturnUrl() {
  const appUrl = getAppUrl();
  return `${appUrl}/auth/checkout-complete?session_id={CHECKOUT_SESSION_ID}`;
}

export async function createSubscriptionCheckoutSession({
  plan,
  user,
  uiMode,
}: {
  plan: Plan;
  user?: User | null;
  uiMode: CheckoutMode;
}) {
  if (!stripe || !plan.stripePriceId) {
    throw new Error("Paiement non configuré pour ce plan");
  }

  const returnUrl = getCheckoutReturnUrl();

  const sharedParams: Stripe.Checkout.SessionCreateParams = user?.id
    ? await buildAuthenticatedCheckoutParams(plan, user)
    : buildGuestCheckoutParams(plan);

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
    line_items: [{ price: plan.stripePriceId!, quantity: 1 }],
    client_reference_id: user.id,
    metadata: {
      supabase_user_id: user.id,
      plan_id: plan.id,
      guest_checkout: "false",
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
    line_items: [{ price: plan.stripePriceId!, quantity: 1 }],
    metadata: {
      plan_id: plan.id,
      guest_checkout: "true",
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
