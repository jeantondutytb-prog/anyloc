import type { User } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { Plan } from "@/lib/constants";
import { ensureStripeCustomerForUser } from "@/lib/billing";
import { getStripeTrialEndUnix } from "@/lib/trial";
import { getAppUrl, stripe } from "@/lib/stripe";

type CheckoutMode = "embedded_page" | "hosted_page";

export async function createSubscriptionCheckoutSession({
  plan,
  user,
  uiMode,
}: {
  plan: Plan;
  user: User;
  uiMode: CheckoutMode;
}) {
  if (!stripe || !plan.stripePriceId) {
    throw new Error("Paiement non configuré pour ce plan");
  }

  if (!user.email) {
    throw new Error("Ton compte n'a pas d'email associé.");
  }

  const appUrl = getAppUrl();
  const customerId = await ensureStripeCustomerForUser({
    userId: user.id,
    email: user.email,
  });

  const sharedParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    client_reference_id: user.id,
    metadata: {
      supabase_user_id: user.id,
      plan_id: plan.id,
    },
    payment_method_collection: "always",
    subscription_data: {
      trial_end: getStripeTrialEndUnix(),
      metadata: {
        supabase_user_id: user.id,
        plan_id: plan.id,
      },
    },
    ...(customerId
      ? { customer: customerId }
      : { customer_email: user.email }),
  };

  if (uiMode === "embedded_page") {
    return stripe.checkout.sessions.create({
      ...sharedParams,
      ui_mode: "embedded_page",
      return_url: `${appUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
    });
  }

  return stripe.checkout.sessions.create({
    ...sharedParams,
    ui_mode: "hosted_page",
    success_url: `${appUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/checkout?plan=${plan.id}&canceled=true`,
  });
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
