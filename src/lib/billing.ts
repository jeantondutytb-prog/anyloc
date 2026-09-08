import type Stripe from "stripe";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

export type ProfileRow = {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  plan_id: string | null;
};

export async function getProfileStripeCustomerId(userId: string) {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  return data?.stripe_customer_id ?? null;
}

export async function ensureStripeCustomerForUser({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  if (!stripe) {
    console.warn("[billing] Stripe not configured, skipping customer creation.");
    return null;
  }

  const existingCustomerId = await getProfileStripeCustomerId(userId);
  if (existingCustomerId) {
    return existingCustomerId;
  }

  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  const customer =
    existingCustomers.data[0] ??
    (await stripe.customers.create({
      email,
      metadata: {
        supabase_user_id: userId,
      },
    }));

  if (isSupabaseAdminConfigured()) {
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").upsert(
      {
        id: userId,
        email,
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      throw new Error(`Failed to save Stripe customer on profile: ${error.message}`);
    }
  }

  return customer.id;
}

export async function syncProfileFromCheckoutSession(
  session: Stripe.Checkout.Session
) {
  if (!isSupabaseAdminConfigured()) {
    console.warn("[billing] Supabase admin not configured, skipping profile sync.");
    return;
  }

  const userId =
    session.client_reference_id ?? session.metadata?.supabase_user_id;

  if (!userId) {
    console.warn("[billing] Checkout session missing Supabase user id.");
    return;
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      email: session.customer_details?.email ?? session.customer_email ?? null,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: subscriptionId ?? null,
      subscription_status: subscriptionId ? "active" : null,
      plan_id: session.metadata?.plan_id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(`Failed to sync profile from checkout: ${error.message}`);
  }
}

export async function syncProfileFromSubscription(
  subscription: Stripe.Subscription
) {
  if (!isSupabaseAdminConfigured()) {
    console.warn("[billing] Supabase admin not configured, skipping profile sync.");
    return;
  }

  const userId = subscription.metadata?.supabase_user_id;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  const admin = createAdminClient();

  if (userId) {
    const { error } = await admin.from("profiles").upsert(
      {
        id: userId,
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        plan_id: subscription.metadata?.plan_id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      throw new Error(`Failed to sync profile from subscription: ${error.message}`);
    }

    return;
  }

  if (!customerId) {
    console.warn("[billing] Subscription missing customer id.");
    return;
  }

  const { error } = await admin
    .from("profiles")
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      plan_id: subscription.metadata?.plan_id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw new Error(`Failed to update profile from subscription: ${error.message}`);
  }
}
