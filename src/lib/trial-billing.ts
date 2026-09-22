import type Stripe from "stripe";
import { PLANS, isValidPlanId } from "@/lib/constants";
import { ensureUserForEmail } from "@/lib/guest-account";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import {
  getTrialEndUnixFromNow,
  isTrialDurationDrifted,
  TRIAL_DURATION_SECONDS,
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

async function findTrialingSubscriptionForCheckoutSession(
  customerId: string,
  checkoutSessionId: string
) {
  if (!stripe) {
    return null;
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  return (
    subscriptions.data.find(
      (subscription) =>
        subscription.metadata?.checkout_session_id === checkoutSessionId &&
        (subscription.status === "trialing" || subscription.status === "active")
    ) ?? null
  );
}

async function createTrialingSubscription({
  customerId,
  paymentMethodId,
  planId,
  userId,
  guestCheckout,
  checkoutSessionId,
}: {
  customerId: string;
  paymentMethodId: string;
  planId: string;
  userId: string;
  guestCheckout: boolean;
  checkoutSessionId: string;
}) {
  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const plan = PLANS.find((item) => item.id === planId);

  if (!plan?.stripePriceId) {
    throw new Error(`Invalid plan_id for trial subscription: ${planId}`);
  }

  const expectedTrialEnd = getTrialEndUnixFromNow();

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
      checkout_session_id: checkoutSessionId,
    },
  });

  if (
    subscription.trial_start &&
    subscription.trial_end &&
    isTrialDurationDrifted(subscription.trial_start, subscription.trial_end)
  ) {
    const correctedTrialEnd = subscription.trial_start + TRIAL_DURATION_SECONDS;

    console.warn(
      `[trial-billing] Subscription ${subscription.id} trial drifted; correcting trial_end to ${correctedTrialEnd}.`
    );

    return stripe.subscriptions.update(subscription.id, {
      trial_end: correctedTrialEnd,
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

  const existingSubscription = await findTrialingSubscriptionForCheckoutSession(
    customerId,
    session.id
  );

  const subscription =
    existingSubscription ??
    (await createTrialingSubscription({
      customerId,
      paymentMethodId,
      planId: planId!,
      userId,
      guestCheckout: session.metadata?.guest_checkout === "true",
      checkoutSessionId: session.id,
    }));

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
    throw new Error("Aucun abonnement actif à annuler.");
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

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parentSubscription = invoice.parent?.subscription_details?.subscription;

  if (typeof parentSubscription === "string") {
    return parentSubscription;
  }

  if (parentSubscription && typeof parentSubscription === "object") {
    return parentSubscription.id ?? null;
  }

  return null;
}

/**
 * Stripe leaves subscription invoices in draft for ~1 hour before auto-charging.
 * Pay immediately on invoice.created so the post-trial (and renewal) charge
 * happens at trial_end / period end instead of ~60 minutes later.
 *
 * @see https://docs.stripe.com/billing/subscriptions/trials/free-trials
 */
export async function chargeSubscriptionInvoiceImmediately(
  invoice: Stripe.Invoice
) {
  if (!stripe) {
    return { attempted: false, paid: false, reason: "stripe_unconfigured" as const };
  }

  if (!invoice.id) {
    return { attempted: false, paid: false, reason: "missing_invoice_id" as const };
  }

  if (invoice.collection_method !== "charge_automatically") {
    return { attempted: false, paid: false, reason: "manual_collection" as const };
  }

  if ((invoice.amount_due ?? 0) <= 0) {
    return { attempted: false, paid: false, reason: "zero_amount" as const };
  }

  if (invoice.status === "paid" || invoice.status === "void") {
    return { attempted: false, paid: false, reason: "already_settled" as const };
  }

  if (invoice.status !== "draft" && invoice.status !== "open") {
    return { attempted: false, paid: false, reason: "not_payable" as const };
  }

  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    return { attempted: false, paid: false, reason: "not_subscription" as const };
  }

  try {
    const paidInvoice = await stripe.invoices.pay(invoice.id);

    if (paidInvoice.status === "paid") {
      console.info(
        `[trial-billing] Charged invoice ${invoice.id} immediately (subscription ${subscriptionId}, reason=${invoice.billing_reason}).`
      );
      return { attempted: true, paid: true, reason: "paid" as const };
    }

    console.warn(
      `[trial-billing] Immediate pay left invoice ${invoice.id} in status=${paidInvoice.status}.`
    );
    return { attempted: true, paid: false, reason: "not_paid" as const };
  } catch (error) {
    // Card declines / missing PM still surface via subscription.updated → past_due.
    console.error(
      `[trial-billing] Immediate invoice pay failed for ${invoice.id}`,
      error
    );
    return { attempted: true, paid: false, reason: "pay_failed" as const };
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

async function listAllSubscriptionsByStatus(
  status: Stripe.Subscription.Status
) {
  if (!stripe) {
    return [] as Stripe.Subscription[];
  }

  const subscriptions: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;

  for (;;) {
    const page = await stripe.subscriptions.list({
      status,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    subscriptions.push(...page.data);

    if (!page.has_more || page.data.length === 0) {
      break;
    }

    startingAfter = page.data[page.data.length - 1]?.id;
  }

  return subscriptions;
}

async function markLocalProfileCanceled(subscription: Stripe.Subscription) {
  if (!isSupabaseAdminConfigured()) {
    return;
  }

  const admin = createAdminClient();
  const patch = {
    subscription_status: "canceled",
    trial_status: "cancelled" as TrialStatus,
    updated_at: new Date().toISOString(),
  };

  // Only the row that still points at this subscription — never overwrite a
  // profile whose current Stripe sub is a different, already-paid one.
  const { error } = await admin
    .from("profiles")
    .update(patch)
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    throw new Error(`Failed to mark profile canceled: ${error.message}`);
  }
}

async function listAllOpenInvoices() {
  if (!stripe) {
    return [] as Stripe.Invoice[];
  }

  const invoices: Stripe.Invoice[] = [];
  let startingAfter: string | undefined;

  for (;;) {
    const page = await stripe.invoices.list({
      status: "open",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    invoices.push(...page.data);

    if (!page.has_more || page.data.length === 0) {
      break;
    }

    startingAfter = page.data[page.data.length - 1]?.id;
  }

  return invoices;
}

const KEEP_OPEN_INVOICE_SUB_STATUSES = new Set(["active", "trialing"]);

async function voidOrphanOpenInvoices() {
  if (!stripe) {
    return { voided: [] as string[], skipped: 0, errors: [] as Array<{ invoiceId: string; error: string }> };
  }

  const voided: string[] = [];
  const errors: Array<{ invoiceId: string; error: string }> = [];
  let skipped = 0;

  const invoices = await listAllOpenInvoices();

  for (const invoice of invoices) {
    if (!invoice.id) {
      continue;
    }

    const subscriptionId = getInvoiceSubscriptionId(invoice);

    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        if (KEEP_OPEN_INVOICE_SUB_STATUSES.has(subscription.status)) {
          skipped += 1;
          continue;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load subscription.";
        errors.push({ invoiceId: invoice.id, error: message });
        continue;
      }
    }

    try {
      const voidedInvoice = await stripe.invoices.voidInvoice(invoice.id);

      if (voidedInvoice.status === "void") {
        voided.push(invoice.id);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to void invoice.";
      errors.push({ invoiceId: invoice.id, error: message });
      console.error(`[trial-billing] Failed to void invoice ${invoice.id}`, error);
    }
  }

  return { voided, skipped, errors };
}

/**
 * Cancels unpaid / past_due / incomplete subscriptions and voids leftover
 * open invoices. Does not refund, cancel, or otherwise change active paid
 * subscriptions (including duplicate paid ones).
 */
export async function enforcePaidSubscriptions() {
  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const canceled: string[] = [];
  const errors: Array<{ subscriptionId?: string; invoiceId?: string; error: string }> = [];

  for (const status of ["past_due", "unpaid", "incomplete"] as const) {
    const unpaid = await listAllSubscriptionsByStatus(status);

    for (const subscription of unpaid) {
      if (canceled.includes(subscription.id)) {
        continue;
      }

      try {
        const canceledSub = await stripe.subscriptions.cancel(subscription.id, {
          invoice_now: false,
          prorate: false,
        });
        canceled.push(canceledSub.id);
        await markLocalProfileCanceled(canceledSub);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to cancel unpaid.";
        errors.push({ subscriptionId: subscription.id, error: message });
        console.error(
          `[trial-billing] Failed to enforce unpaid ${subscription.id}`,
          error
        );
      }
    }
  }

  const voidResult = await voidOrphanOpenInvoices();
  errors.push(
    ...voidResult.errors.map((item) => ({
      invoiceId: item.invoiceId,
      error: item.error,
    }))
  );

  return {
    canceled: canceled.length,
    canceledIds: canceled,
    voided: voidResult.voided.length,
    voidedIds: voidResult.voided,
    openInvoicesKept: voidResult.skipped,
    errors,
  };
}
