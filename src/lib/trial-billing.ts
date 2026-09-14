import type Stripe from "stripe";
import { PLANS } from "@/lib/constants";
import { ensureUserForEmail } from "@/lib/guest-account";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { getTrialEndDate } from "@/lib/trial";

async function resolveSetupIntentPaymentMethodId(
  setupIntentRef: string | Stripe.SetupIntent | null | undefined
) {
  if (!stripe || !setupIntentRef) {
    return null;
  }

  const setupIntent =
    typeof setupIntentRef === "string"
      ? await stripe.setupIntents.retrieve(setupIntentRef)
      : setupIntentRef;

  const paymentMethod = setupIntent.payment_method;

  return typeof paymentMethod === "string"
    ? paymentMethod
    : paymentMethod?.id ?? null;
}

export async function syncProfileFromTrialSetupSession(
  session: Stripe.Checkout.Session
) {
  if (!isSupabaseAdminConfigured() || !stripe) {
    console.warn("[trial-billing] Missing Stripe or Supabase admin config.");
    return;
  }

  if (session.mode !== "setup" || session.status !== "complete") {
    console.warn(
      `[trial-billing] Session ${session.id} ignored: mode=${session.mode}, status=${session.status}`
    );
    return;
  }

  const email =
    session.customer_details?.email?.trim() ??
    session.customer_email?.trim() ??
    null;

  let userId =
    session.client_reference_id ?? session.metadata?.supabase_user_id ?? null;

  if (!userId && email) {
    userId = await ensureUserForEmail(email);
  }

  if (!userId) {
    console.warn("[trial-billing] Setup session missing Supabase user id and email.");
    return;
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  const setupIntentRef = session.setup_intent;
  const paymentMethodId = await resolveSetupIntentPaymentMethodId(setupIntentRef);

  if (!paymentMethodId) {
    throw new Error(`Trial setup session ${session.id} is missing a payment method.`);
  }

  if (customerId) {
    await stripe.customers.update(customerId, {
      email: email ?? undefined,
      metadata: {
        supabase_user_id: userId,
      },
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  const trialStartedAt = new Date();
  const trialEndsAt = getTrialEndDate(trialStartedAt);
  const planId = session.metadata?.plan_id ?? null;

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      stripe_customer_id: customerId ?? null,
      plan_id: planId,
      subscription_status: "trialing",
      trial_started_at: trialStartedAt.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      trial_status: "active",
      trial_payment_method_id: paymentMethodId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(`Failed to sync trial profile: ${error.message}`);
  }
}

export async function chargeExpiredTrialForProfile(profile: {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
  plan_id: string | null;
  trial_payment_method_id: string | null;
}) {
  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  if (!profile.stripe_customer_id || !profile.trial_payment_method_id) {
    throw new Error("Trial profile is missing Stripe customer or payment method.");
  }

  const plan = PLANS.find((item) => item.id === profile.plan_id);

  if (!plan?.stripePriceId) {
    throw new Error(`Trial profile has invalid plan_id: ${profile.plan_id}`);
  }

  const subscription = await stripe.subscriptions.create({
    customer: profile.stripe_customer_id,
    items: [{ price: plan.stripePriceId, quantity: 1 }],
    default_payment_method: profile.trial_payment_method_id,
    metadata: {
      supabase_user_id: profile.id,
      plan_id: plan.id,
      guest_checkout: "false",
      converted_from_trial: "true",
    },
  });

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      plan_id: plan.id,
      trial_status: "converted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (error) {
    throw new Error(`Failed to mark trial converted: ${error.message}`);
  }

  return subscription;
}

export async function cancelActiveTrialForUser(userId: string) {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin is not configured.");
  }

  const admin = createAdminClient();
  const { data, error: fetchError } = await admin
    .from("profiles")
    .select("id, trial_status, trial_ends_at, trial_started_at, trial_payment_method_id")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError || !data) {
    throw new Error("Profil introuvable.");
  }

  if (data.trial_status !== "active") {
    throw new Error("Aucun essai actif à annuler.");
  }

  const { error } = await admin
    .from("profiles")
    .update({
      trial_status: "cancelled",
      subscription_status: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .eq("trial_status", "active");

  if (error) {
    throw new Error(`Failed to cancel trial: ${error.message}`);
  }
}

export async function processDueTrialCharges() {
  if (!isSupabaseAdminConfigured()) {
    return { processed: 0, failed: 0 };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: dueTrials, error } = await admin
    .from("profiles")
    .select(
      "id, email, stripe_customer_id, plan_id, trial_payment_method_id, trial_status, trial_ends_at"
    )
    .eq("trial_status", "active")
    .lte("trial_ends_at", now);

  if (error) {
    throw new Error(`Failed to load due trials: ${error.message}`);
  }

  let processed = 0;
  let failed = 0;

  for (const profile of dueTrials ?? []) {
    try {
      await chargeExpiredTrialForProfile(profile);
      processed += 1;
    } catch (chargeError) {
      failed += 1;
      console.error(`[trial-billing] Charge failed for ${profile.id}`, chargeError);

      await admin
        .from("profiles")
        .update({
          trial_status: "charge_failed",
          subscription_status: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)
        .eq("trial_status", "active");
    }
  }

  return { processed, failed };
}
