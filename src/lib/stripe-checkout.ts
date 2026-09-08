import type { User } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { Plan } from "@/lib/constants";
import { ensureStripeCustomerForUser } from "@/lib/billing";
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
    subscription_data: {
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

export async function createSubscriptionPaymentIntent({
  plan,
  user,
}: {
  plan: Plan;
  user: User;
}) {
  if (!stripe || !plan.stripePriceId) {
    throw new Error("Paiement non configuré pour ce plan");
  }

  if (!user.email) {
    throw new Error("Ton compte n'a pas d'email associé.");
  }

  const customerId = await ensureStripeCustomerForUser({
    userId: user.id,
    email: user.email,
  });

  if (!customerId) {
    throw new Error("Impossible de créer le client Stripe.");
  }

  const incompleteSubscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "incomplete",
    limit: 10,
  });

  for (const subscription of incompleteSubscriptions.data) {
    await stripe.subscriptions.cancel(subscription.id);
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: plan.stripePriceId }],
    payment_behavior: "default_incomplete",
    payment_settings: {
      save_default_payment_method: "on_subscription",
    },
    expand: ["latest_invoice.confirmation_secret"],
    metadata: {
      supabase_user_id: user.id,
      plan_id: plan.id,
    },
  });

  const invoice = subscription.latest_invoice as Stripe.Invoice | null;
  const clientSecret = invoice?.confirmation_secret?.client_secret ?? null;

  if (!clientSecret) {
    throw new Error("Impossible de préparer le paiement.");
  }

  return {
    clientSecret,
    subscriptionId: subscription.id,
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
