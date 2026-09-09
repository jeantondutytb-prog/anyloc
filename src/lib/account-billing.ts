import type Stripe from "stripe";
import { PLANS } from "@/lib/constants";
import type {
  AccountBillingDetails,
  AccountInvoice,
  AccountPaymentMethod,
} from "@/lib/account-billing-types";
import { getProfileStripeCustomerId, type ProfileRow } from "@/lib/billing";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getAppUrl, stripe } from "@/lib/stripe";
import { isActiveSubscriptionStatus } from "@/lib/subscription";

export function getPlanLabel(planId: string | null) {
  if (!planId) {
    return null;
  }

  return PLANS.find((plan) => plan.id === planId)?.name ?? planId;
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
}: {
  userId: string;
  email: string;
  isAdmin: boolean;
}): Promise<AccountBillingDetails> {
  const profile = await getProfileForUser(userId);
  const planId = isAdmin ? "admin" : profile?.plan_id ?? null;
  const subscriptionStatus = isAdmin ? "admin" : profile?.subscription_status ?? null;
  const customerId = profile?.stripe_customer_id ?? (await getProfileStripeCustomerId(userId));

  let paymentMethod: AccountPaymentMethod | null = null;
  let invoices: AccountInvoice[] = [];

  if (stripe && customerId) {
    try {
      paymentMethod = await getPaymentMethod(customerId);
      const invoiceList = await stripe.invoices.list({
        customer: customerId,
        limit: 10,
      });
      invoices = invoiceList.data.map(mapInvoice);
    } catch (error) {
      console.error("[account-billing] Failed to load Stripe data:", error);
    }
  }

  return {
    email,
    planId,
    planName: getPlanLabel(planId),
    subscriptionStatus,
    hasActiveSubscription: isAdmin || isActiveSubscriptionStatus(subscriptionStatus),
    isAdmin,
    paymentMethod,
    invoices,
    canManageBilling: Boolean(stripe && customerId),
  };
}

export async function createBillingPortalSession({
  userId,
  flow = "default",
}: {
  userId: string;
  flow?: "default" | "subscription" | "payment_method";
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

  const session = await stripe.billingPortal.sessions.create(sessionParams);
  return session.url;
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
    console.error("[account-billing] Failed to cancel subscription:", error);
  }
}
