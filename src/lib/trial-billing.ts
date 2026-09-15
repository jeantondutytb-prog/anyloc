import type Stripe from "stripe";
import { PLANS, isValidPlanId } from "@/lib/constants";
import { ensureUserForEmail } from "@/lib/guest-account";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import {
  getTrialEndUnix,
  TRIAL_DURATION_MS,
  type TrialStatus,
  unixToIso,
} from "@/lib/trial";

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

export function getTrialProfilePatchFromSubscription(
  subscription: Stripe.Subscription
) {
  const basePatch = {
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    plan_id: subscription.metadata?.plan_id ?? null,
  };

  if (!subscription.trial_start && !subscription.trial_end) {
    return basePatch;
  }

  const trialStart = unixToIso(subscription.trial_start);
  const trialEnd = unixToIso(subscription.trial_end);

  let trialStatus: TrialStatus | null = null;

  if (subscription.status === "trialing") {
    trialStatus = "active";
  } else if (
    subscription.status === "active" &&
    subscription.trial_end &&
    subscription.trial_end * 1000 <= Date.now()
  ) {
    trialStatus = "converted";
  } else if (
    subscription.status === "active" &&
    subscription.trial_end &&
    subscription.trial_end * 1000 > Date.now()
  ) {
    trialStatus = "active";
  } else if (
    subscription.status === "canceled" &&
    subscription.trial_end &&
    subscription.canceled_at &&
    subscription.canceled_at <= subscription.trial_end
  ) {
    trialStatus = "cancelled";
  }

  return {
    ...basePatch,
    trial_started_at: trialStart,
    trial_ends_at: trialEnd,
    trial_status: trialStatus,
  };
}

async function createTrialingSubscription({
  customerId,
  paymentMethodId,
  planId,
  userId,
  guestCheckout,
}: {
  customerId: string;
  paymentMethodId: string;
  planId: string;
  userId: string;
  guestCheckout: boolean;
}) {
  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const plan = PLANS.find((item) => item.id === planId);

  if (!plan?.stripePriceId) {
    throw new Error(`Invalid plan_id for trial subscription: ${planId}`);
  }

  const trialStartedAt = new Date();

  const expectedTrialEnd = getTrialEndUnix(trialStartedAt);

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: plan.stripePriceId, quantity: 1 }],
    default_payment_method: paymentMethodId,
    trial_end: expectedTrialEnd,
    metadata: {
      supabase_user_id: userId,
      plan_id: plan.id,
      guest_checkout: guestCheckout ? "true" : "false",
      converted_from_trial: "true",
    },
  });

  if (
    subscription.trial_start &&
    subscription.trial_end &&
    (subscription.trial_end - subscription.trial_start) * 1000 >
      TRIAL_DURATION_MS + 60_000
  ) {
    console.warn(
      `[trial-billing] Subscription ${subscription.id} trial longer than expected; correcting trial_end.`
    );

    return stripe.subscriptions.update(subscription.id, {
      trial_end: expectedTrialEnd,
      proration_behavior: "none",
    });
  }

  return subscription;
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

  const planId = session.metadata?.plan_id;

  if (!isValidPlanId(planId)) {
    throw new Error(`Trial setup session ${session.id} has invalid plan_id.`);
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

  if (!customerId) {
    throw new Error(`Trial setup session ${session.id} is missing a customer.`);
  }

  const paymentMethodId = await resolveSetupIntentPaymentMethodId(
    session.setup_intent
  );

  if (!paymentMethodId) {
    throw new Error(`Trial setup session ${session.id} is missing a payment method.`);
  }

  await stripe.customers.update(customerId, {
    email: email ?? undefined,
    metadata: {
      supabase_user_id: userId,
    },
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  const subscription = await createTrialingSubscription({
    customerId,
    paymentMethodId,
    planId: planId!,
    userId,
    guestCheckout: session.metadata?.guest_checkout === "true",
  });

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      stripe_customer_id: customerId,
      trial_payment_method_id: paymentMethodId,
      ...getTrialProfilePatchFromSubscription(subscription),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(`Failed to sync trial profile: ${error.message}`);
  }
}

export async function cancelActiveTrialForUser(userId: string) {
  if (!isSupabaseAdminConfigured() || !stripe) {
    throw new Error("Stripe or Supabase admin is not configured.");
  }

  const admin = createAdminClient();
  const { data, error: fetchError } = await admin
    .from("profiles")
    .select(
      "id, trial_status, trial_ends_at, stripe_subscription_id, subscription_status"
    )
    .eq("id", userId)
    .maybeSingle();

  if (fetchError || !data) {
    throw new Error("Profil introuvable.");
  }

  const hasActiveTrial =
    data.trial_status === "active" || data.subscription_status === "trialing";

  if (!hasActiveTrial) {
    throw new Error("Aucun essai actif à annuler.");
  }

  if (data.stripe_subscription_id) {
    await stripe.subscriptions.cancel(data.stripe_subscription_id);
  }

  const { error } = await admin
    .from("profiles")
    .update({
      trial_status: "cancelled",
      subscription_status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to cancel trial: ${error.message}`);
  }
}

/** Legacy fallback for profiles created before Stripe-native trials. */
export async function processDueTrialCharges() {
  if (!isSupabaseAdminConfigured() || !stripe) {
    return { processed: 0, failed: 0 };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: dueTrials, error } = await admin
    .from("profiles")
    .select(
      "id, email, stripe_customer_id, plan_id, trial_payment_method_id, trial_status, trial_ends_at, stripe_subscription_id"
    )
    .eq("trial_status", "active")
    .is("stripe_subscription_id", null)
    .lte("trial_ends_at", now);

  if (error) {
    throw new Error(`Failed to load due trials: ${error.message}`);
  }

  let processed = 0;
  let failed = 0;

  for (const profile of dueTrials ?? []) {
    try {
      if (
        !profile.stripe_customer_id ||
        !profile.trial_payment_method_id ||
        !isValidPlanId(profile.plan_id)
      ) {
        throw new Error("Legacy trial profile is incomplete.");
      }

      const plan = PLANS.find((item) => item.id === profile.plan_id);

      if (!plan?.stripePriceId) {
        throw new Error(`Legacy trial profile has invalid plan_id: ${profile.plan_id}`);
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
        // Legacy DB trial already ended — charge immediately, do not inherit price trial.
      });

      await admin
        .from("profiles")
        .update({
          ...getTrialProfilePatchFromSubscription(subscription),
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      processed += 1;
    } catch (chargeError) {
      failed += 1;
      console.error(`[trial-billing] Legacy trial sync failed for ${profile.id}`, chargeError);

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
