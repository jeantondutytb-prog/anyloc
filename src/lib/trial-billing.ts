import type Stripe from "stripe";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { type TrialStatus, unixToIso } from "@/lib/trial";

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
 * Pay immediately on invoice.created so the renewal charge happens at the
 * period end instead of ~60 minutes later.
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
