import type Stripe from "stripe";
import { ensureUserForEmail, normalizeEmail } from "@/lib/guest-account";
import { logError } from "@/lib/log-error";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { isStaleSubscriptionEvent } from "@/lib/subscription-sync";
import { getTrialProfilePatchFromSubscription } from "@/lib/trial-billing";
import { getCanonicalPlanId, isOneTimePlanId } from "@/lib/constants";

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

/** Returns the Supabase user the session belongs to (found or created from its email). */
export async function syncProfileFromCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<string | null> {
  if (!isSupabaseAdminConfigured()) {
    await logError("billing", "Supabase admin not configured, checkout not synced", {
      stripe_session_id: session.id,
    });
    return null;
  }

  if (
    session.payment_status &&
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    console.warn(
      `[billing] Checkout session ${session.id} ignored: payment_status=${session.payment_status}`
    );
    return null;
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
    await logError("billing", "Paid checkout session has no user id nor email", {
      stripe_session_id: session.id,
    });
    return null;
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (customerId && stripe) {
    await stripe.customers.update(customerId, {
      email: email ?? undefined,
      metadata: {
        supabase_user_id: userId,
      },
    });
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  let subscriptionStatus: string | null = null;

  let trialPatch = {};

  const checkoutPlanId = session.metadata?.plan_id ?? null;
  // A paid one-time checkout (the lifetime plan) opens access with no
  // subscription behind it; isStaleSubscriptionEvent then keeps it open.
  const oneTimePurchase = session.mode === "payment" && isOneTimePlanId(checkoutPlanId);

  if (oneTimePurchase) {
    // Read the payment from Stripe rather than the session: a late or
    // replayed checkout event must not reopen a refunded or disputed purchase.
    subscriptionStatus = await getOneTimePurchaseStatus(session);
  } else if (subscriptionId && stripe) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    subscriptionStatus = subscription.status;
    trialPatch = getTrialProfilePatchFromSubscription(subscription);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      email: email ? normalizeEmail(email) : null,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: subscriptionId ?? null,
      subscription_status: subscriptionStatus,
      plan_id: checkoutPlanId ? getCanonicalPlanId(checkoutPlanId) : null,
      ...trialPatch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(`Failed to sync profile from checkout: ${error.message}`);
  }

  return userId;
}

async function resolveExistingAuthUserId(
  admin: ReturnType<typeof createAdminClient>,
  userId: string | null
) {
  if (!userId) {
    return null;
  }

  const { data, error } = await admin.auth.admin.getUserById(userId);

  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

async function isStaleForProfile(
  admin: ReturnType<typeof createAdminClient>,
  column: "id" | "stripe_customer_id",
  value: string,
  subscription: Stripe.Subscription
) {
  const { data } = await admin
    .from("profiles")
    .select("stripe_subscription_id, subscription_status, plan_id")
    .eq(column, value)
    .maybeSingle();

  if (!isStaleSubscriptionEvent(data, subscription)) {
    return false;
  }

  console.warn(
    `[billing] Ignoring ${subscription.status} subscription ${subscription.id}: profile is on ${data?.stripe_subscription_id} (${data?.subscription_status}).`
  );
  return true;
}

export async function syncProfileFromSubscription(
  subscription: Stripe.Subscription
) {
  if (!isSupabaseAdminConfigured()) {
    await logError("billing", "Supabase admin not configured, subscription not synced", {
      stripe_subscription_id: subscription.id,
    });
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  const admin = createAdminClient();
  const metadataUserId = subscription.metadata?.supabase_user_id ?? null;
  let userId = await resolveExistingAuthUserId(admin, metadataUserId);

  if (metadataUserId && !userId) {
    await logError("billing", "Subscription belongs to a deleted account", {
      userId: metadataUserId,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
    });
    return;
  }

  if (!userId && customerId && stripe) {
    const customer = await stripe.customers.retrieve(customerId);

    if (!customer.deleted && customer.email) {
      userId = await ensureUserForEmail(customer.email);
      await stripe.subscriptions.update(subscription.id, {
        metadata: {
          ...subscription.metadata,
          supabase_user_id: userId,
          plan_id: subscription.metadata?.plan_id ?? "",
        },
      });
    }
  }

  if (userId) {
    if (await isStaleForProfile(admin, "id", userId, subscription)) {
      return;
    }

    const trialPatch = getTrialProfilePatchFromSubscription(subscription);
    const { error } = await admin.from("profiles").upsert(
      {
        id: userId,
        stripe_customer_id: customerId ?? null,
        ...trialPatch,
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
    await logError("billing", "Subscription has no customer id", {
      stripe_subscription_id: subscription.id,
    });
    return;
  }

  if (await isStaleForProfile(admin, "stripe_customer_id", customerId, subscription)) {
    return;
  }

  const trialPatch = getTrialProfilePatchFromSubscription(subscription);
  const { error } = await admin
    .from("profiles")
    .update({
      ...trialPatch,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw new Error(`Failed to update profile from subscription: ${error.message}`);
  }
}

/**
 * Access status of a paid one-time checkout, read from its charge: "refunded"
 * once any of it was refunded, "disputed" once the customer opened a dispute,
 * else "active".
 */
async function getOneTimePurchaseStatus(session: Stripe.Checkout.Session) {
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  if (!stripe || !paymentIntentId) {
    return "active";
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });
  const charge = paymentIntent.latest_charge;

  if (!charge || typeof charge === "string") {
    return "active";
  }

  if (charge.refunded || charge.amount_refunded > 0) {
    return "refunded";
  }

  return charge.disputed ? "disputed" : "active";
}

/**
 * Closes the access a lifetime purchase opened. Subscriptions are refunded by
 * cancelling them, which the customer.subscription.* events sync.
 */
async function revokeOneTimePurchase({
  paymentIntentId,
  customerId,
  status,
  stripeObjectId,
}: {
  paymentIntentId: string | null | undefined;
  customerId: string | null | undefined;
  status: "refunded" | "disputed";
  stripeObjectId: string;
}) {
  if (!paymentIntentId || !stripe || !isSupabaseAdminConfigured()) {
    return;
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (!isOneTimePlanId(paymentIntent.metadata?.plan_id)) {
    return;
  }

  const customer =
    customerId ??
    (typeof paymentIntent.customer === "string" ? paymentIntent.customer : paymentIntent.customer?.id);
  const userId = paymentIntent.metadata?.supabase_user_id || null;

  if (!userId && !customer) {
    await logError("billing", "Revoked lifetime purchase has no user nor customer", {
      stripe_object_id: stripeObjectId,
      status,
    });
    return;
  }

  const admin = createAdminClient();
  const query = admin
    .from("profiles")
    .update({ subscription_status: status, updated_at: new Date().toISOString() })
    .eq("plan_id", paymentIntent.metadata.plan_id);
  const { error } = userId
    ? await query.eq("id", userId)
    : await query.eq("stripe_customer_id", customer!);

  if (error) {
    throw new Error(`Failed to revoke lifetime purchase: ${error.message}`);
  }
}

/** Any refund of a lifetime purchase closes its access (the guarantee refunds it in full). */
export async function revokeRefundedOneTimePurchase(charge: Stripe.Charge) {
  if (charge.amount_refunded <= 0) {
    return;
  }

  await revokeOneTimePurchase({
    paymentIntentId:
      typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id,
    customerId: typeof charge.customer === "string" ? charge.customer : charge.customer?.id,
    status: "refunded",
    stripeObjectId: charge.id,
  });
}

/** A dispute (chargeback) on a lifetime purchase closes its access. */
export async function revokeDisputedOneTimePurchase(dispute: Stripe.Dispute) {
  await revokeOneTimePurchase({
    paymentIntentId:
      typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id,
    customerId: null,
    status: "disputed",
    stripeObjectId: dispute.id,
  });
}
