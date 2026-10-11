import type Stripe from "stripe";
import {
  CANCEL_ENDING_EMAIL_SENT_KEY,
  CANCEL_SCHEDULED_KEY,
} from "@/lib/cancel-ending-email";
import { getPlanDisplayName } from "@/lib/constants";
import { logError } from "@/lib/log-error";
import type {
  BillingPortalFlow,
  AccountBillingDetails,
  AccountInvoice,
  AccountPaymentMethod,
} from "@/lib/account-billing-types";
import {
  getProfileStripeCustomerId,
  syncProfileFromSubscription,
  type ProfileRow,
} from "@/lib/billing";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getAppUrl, stripe } from "@/lib/stripe";
import { isActiveSubscriptionStatus } from "@/lib/subscription";

export type { BillingPortalFlow };

export const SETTLE_PAST_DUE_PATH = "/api/stripe/settle-past-due";

export function getPlanLabel(planId: string | null) {
  if (!planId) {
    return null;
  }

  return getPlanDisplayName(planId);
}

async function getProfileForUser(userId: string): Promise<ProfileRow | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select(
      "id, email, stripe_customer_id, stripe_subscription_id, subscription_status, plan_id"
    )
    .eq("id", userId)
    .maybeSingle();

  return data;
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function mapInvoice(invoice: Stripe.Invoice): AccountInvoice {
  return {
    id: invoice.id,
    date: new Date((invoice.created ?? 0) * 1000).toISOString(),
    amount: formatAmount(invoice.amount_paid ?? invoice.total ?? 0, invoice.currency),
    status: invoice.status ?? "unknown",
    pdfUrl: invoice.invoice_pdf ?? null,
  };
}

async function getPaymentMethod(
  customerId: string
): Promise<AccountPaymentMethod | null> {
  if (!stripe) {
    return null;
  }

  const customer = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });

  if (customer.deleted) {
    return null;
  }

  const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

  if (!defaultPaymentMethod || typeof defaultPaymentMethod === "string") {
    return null;
  }

  if (defaultPaymentMethod.object !== "payment_method" || !defaultPaymentMethod.card) {
    return null;
  }

  return {
    brand: defaultPaymentMethod.card.brand,
    last4: defaultPaymentMethod.card.last4,
    expMonth: defaultPaymentMethod.card.exp_month,
    expYear: defaultPaymentMethod.card.exp_year,
  };
}

export async function getAccountBillingDetails({
  userId,
  email,
  isAdmin,
  isClipper = false,
}: {
  userId: string;
  email: string;
  isAdmin: boolean;
  isClipper?: boolean;
}): Promise<AccountBillingDetails> {
  const profile = await getProfileForUser(userId);
  const planId = isAdmin ? "admin" : isClipper ? "clipper" : profile?.plan_id ?? null;
  const subscriptionStatus = isAdmin
    ? "admin"
    : isClipper
      ? "clipper"
      : profile?.subscription_status ?? null;
  const customerId = profile?.stripe_customer_id ?? (await getProfileStripeCustomerId(userId));

  let paymentMethod: AccountPaymentMethod | null = null;
  let invoices: AccountInvoice[] = [];
  let cancelsAt: string | null = null;

  if (stripe && customerId) {
    try {
      paymentMethod = await getPaymentMethod(customerId);
      const invoiceList = await stripe.invoices.list({
        customer: customerId,
        limit: 10,
      });
      invoices = invoiceList.data.map(mapInvoice);

      if (profile?.stripe_subscription_id && !isAdmin && !isClipper) {
        const subscription = await stripe.subscriptions.retrieve(
          profile.stripe_subscription_id
        );
        cancelsAt = getScheduledCancellationDate(subscription);
      }
    } catch (error) {
      await logError("account-billing/load", error, { userId });
    }
  }

  return {
    email,
    planId,
    planName: getPlanLabel(planId),
    subscriptionStatus,
    hasActiveSubscription:
      isAdmin || isClipper || isActiveSubscriptionStatus(subscriptionStatus),
    isAdmin,
    isClipper,
    paymentMethod,
    invoices,
    canManageBilling: Boolean(stripe && customerId),
    cancelsAt,
  };
}

export async function createBillingPortalSession({
  userId,
  flow = "default",
}: {
  userId: string;
  flow?: BillingPortalFlow;
}) {
  if (!stripe) {
    throw new Error("La gestion de facturation n'est pas configurée.");
  }

  const customerId = await getProfileStripeCustomerId(userId);

  if (!customerId) {
    throw new Error("Aucun client Stripe associé à ce compte.");
  }

  const profile = await getProfileForUser(userId);
  const returnUrl = `${getAppUrl()}/dashboard/settings`;

  const sessionParams: Stripe.BillingPortal.SessionCreateParams = {
    customer: customerId,
    return_url: returnUrl,
  };

  if (flow === "subscription" && profile?.stripe_subscription_id) {
    sessionParams.flow_data = {
      type: "subscription_update",
      subscription_update: {
        subscription: profile.stripe_subscription_id,
      },
    };
  }

  if (flow === "payment_method") {
    sessionParams.flow_data = {
      type: "payment_method_update",
    };
  }

  // Renewal failed: after the new card is saved, come back to settle the
  // overdue invoice with it instead of waiting for the next Smart Retry.
  if (flow === "past_due_card") {
    sessionParams.return_url = `${getAppUrl()}/dashboard/expired`;
    sessionParams.flow_data = {
      type: "payment_method_update",
      after_completion: {
        type: "redirect",
        redirect: { return_url: `${getAppUrl()}${SETTLE_PAST_DUE_PATH}` },
      },
    };
  }

  const session = await stripe.billingPortal.sessions.create(sessionParams);
  return session.url;
}

function getScheduledCancellationDate(subscription: Stripe.Subscription) {
  if (subscription.status === "canceled") {
    return null;
  }

  const cancelAt =
    subscription.cancel_at ??
    (subscription.cancel_at_period_end
      ? subscription.items.data[0]?.current_period_end ?? null
      : null);

  return cancelAt ? new Date(cancelAt * 1000).toISOString() : null;
}

async function getSubscriptionForUser(userId: string, missingMessage: string) {
  if (!stripe) {
    throw new Error("La gestion de facturation n'est pas configurée.");
  }

  const profile = await getProfileForUser(userId);

  if (!profile?.stripe_subscription_id) {
    throw new Error(missingMessage);
  }

  return { client: stripe, subscriptionId: profile.stripe_subscription_id };
}

/**
 * Stops renewal but keeps access until the end of the period already paid.
 * The profile flips to canceled when Stripe sends customer.subscription.deleted.
 */
export async function cancelActiveSubscriptionForUser(userId: string) {
  const { client, subscriptionId } = await getSubscriptionForUser(
    userId,
    "Aucun abonnement actif à résilier."
  );

  const subscription = await client.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
    metadata: { [CANCEL_SCHEDULED_KEY]: "true" },
  });

  return getScheduledCancellationDate(subscription);
}

/** Undoes a scheduled cancellation while the paid period is still running. */
export async function resumeSubscriptionForUser(userId: string) {
  const { client, subscriptionId } = await getSubscriptionForUser(
    userId,
    "Aucun abonnement à réactiver."
  );

  const subscription = await client.subscriptions.retrieve(subscriptionId);

  if (subscription.status === "canceled") {
    throw new Error(
      "Ton abonnement est déjà terminé. Réabonne-toi depuis la page Tarification."
    );
  }

  await client.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
    ...(subscription.cancel_at ? { cancel_at: "" as const } : {}),
    // Clears the reminder flags so a later cancellation gets its own email.
    metadata: { [CANCEL_SCHEDULED_KEY]: "", [CANCEL_ENDING_EMAIL_SENT_KEY]: "" },
  });
}

export async function cancelStripeSubscriptionForUser(userId: string) {
  if (!stripe || !isSupabaseAdminConfigured()) {
    return;
  }

  const profile = await getProfileForUser(userId);

  if (!profile?.stripe_subscription_id) {
    return;
  }

  try {
    await stripe.subscriptions.cancel(profile.stripe_subscription_id);
  } catch (error) {
    await logError("account-billing/cancel", error, {
      userId,
      stripe_subscription_id: profile.stripe_subscription_id,
    });
  }
}

/**
 * Called when a past_due customer comes back from the portal with a new card.
 * The subscription keeps its own default card (set by Checkout), which would
 * override the customer's new one, so point it at the new card and pay the
 * overdue invoice right away. Returns whether the subscription is paid up.
 */
export async function settlePastDueSubscriptionForUser(userId: string) {
  if (!stripe) {
    throw new Error("La gestion de facturation n'est pas configurée.");
  }

  const profile = await getProfileForUser(userId);

  if (!profile?.stripe_subscription_id || !profile.stripe_customer_id) {
    return { settled: false as const };
  }

  const subscription = await stripe.subscriptions.retrieve(
    profile.stripe_subscription_id
  );

  if (subscription.status !== "past_due") {
    return { settled: isActiveSubscriptionStatus(subscription.status) };
  }

  const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
  const newCard =
    !customer.deleted && customer.invoice_settings?.default_payment_method
      ? customer.invoice_settings.default_payment_method
      : null;
  const newCardId = typeof newCard === "string" ? newCard : newCard?.id;

  if (!newCardId) {
    return { settled: false as const };
  }

  await stripe.subscriptions.update(subscription.id, {
    default_payment_method: newCardId,
  });

  const latestInvoiceId =
    typeof subscription.latest_invoice === "string"
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id;

  if (latestInvoiceId) {
    try {
      const invoice = await stripe.invoices.retrieve(latestInvoiceId);

      if (invoice.status === "open") {
        await stripe.invoices.pay(latestInvoiceId, {
          payment_method: newCardId,
        });
      }
    } catch (error) {
      // A decline on the new card leaves the subscription past_due; Smart
      // Retries will keep trying it.
      await logError("account-billing/settle-past-due", error, {
        userId,
        stripe_subscription_id: subscription.id,
        stripe_invoice_id: latestInvoiceId,
      });
    }
  }

  const refreshed = await stripe.subscriptions.retrieve(subscription.id);
  await syncProfileFromSubscription(refreshed);

  return { settled: isActiveSubscriptionStatus(refreshed.status) };
}
