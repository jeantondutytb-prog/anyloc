import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  syncProfileFromCheckoutSession,
  syncProfileFromSubscription,
} from "@/lib/billing";
import { isDeclineOfferCode } from "@/lib/checkout-first-month-offer";
import { markCheckoutSessionDeclined } from "@/lib/checkout-first-month-offer-server";
import { chargeSubscriptionInvoiceImmediately } from "@/lib/trial-billing";
import {
  aliasPostHogUser,
  capturePostHogEvent,
  parsePostHogDistinctId,
} from "@/lib/posthog/server";
import { stripe } from "@/lib/stripe";
import { logError } from "@/lib/log-error";
import { claimStripeEvent, releaseStripeEvent } from "@/lib/webhook-idempotency";

export const runtime = "nodejs";

async function trackCheckoutCompleted(
  session: Stripe.Checkout.Session,
  userId: string | null
) {
  // A delayed payment method (e.g. SEPA) completes the session before the money
  // arrives: nothing has been bought yet, so don't count it as a purchase.
  if (
    session.payment_status &&
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return;
  }

  const browserId = parsePostHogDistinctId(session.metadata?.posthog_distinct_id);
  const distinctId = userId ?? browserId ?? `stripe:${session.id}`;

  // Merge the anonymous visit into the account, so the funnel follows the same
  // person from the landing page to the purchase.
  if (userId && browserId) {
    await aliasPostHogUser({ distinctId: userId, alias: browserId });
  }

  await capturePostHogEvent({
    distinctId,
    event: "purchase_completed",
    properties: {
      plan_id: session.metadata?.plan_id,
      guest_checkout: session.metadata?.guest_checkout === "true",
      amount_total: session.amount_total,
      currency: session.currency,
    },
  });
}

/**
 * A delayed payment (e.g. SEPA) that bounced after checkout. The account and
 * subscription status are synced by the customer.subscription.* events; this
 * only records the failure in the funnel.
 */
async function trackCheckoutPaymentFailed(session: Stripe.Checkout.Session) {
  const distinctId =
    session.client_reference_id ??
    session.metadata?.supabase_user_id ??
    parsePostHogDistinctId(session.metadata?.posthog_distinct_id) ??
    `stripe:${session.id}`;

  await capturePostHogEvent({
    distinctId,
    event: "purchase_failed",
    properties: {
      plan_id: session.metadata?.plan_id,
      guest_checkout: session.metadata?.guest_checkout === "true",
      amount_total: session.amount_total,
      currency: session.currency,
    },
  });
}

/**
 * The checkout session a payment attempt comes from. Checkout creates the
 * PaymentIntent when the customer hits "Payer" and stamps the session id on it
 * right after, so payment_intent.created carries none: read it back then.
 */
async function getPaymentIntentCheckoutSession(paymentIntent: Stripe.PaymentIntent) {
  if (!stripe) {
    return null;
  }

  const sessionId =
    paymentIntent.payment_details?.order_reference ??
    (await stripe.paymentIntents.retrieve(paymentIntent.id)).payment_details?.order_reference;

  if (!sessionId?.startsWith("cs_")) {
    return null;
  }

  return stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * "Payer" pressed in the checkout and how it ended. Stripe's in-form analytics
 * are a private preview not enabled on the account, so the webhook is what sees
 * these steps. Same person as checkout_started: account id, else browser id.
 */
async function trackCheckoutPaymentAttempt(
  paymentIntent: Stripe.PaymentIntent,
  outcome: "submitted" | "failed"
) {
  const session = await getPaymentIntentCheckoutSession(paymentIntent);

  if (!session) {
    return;
  }

  const distinctId =
    session.client_reference_id ??
    session.metadata?.supabase_user_id ??
    parsePostHogDistinctId(session.metadata?.posthog_distinct_id) ??
    `stripe:${session.id}`;
  const properties = {
    plan: session.metadata?.plan_id,
    guest_checkout: session.metadata?.guest_checkout === "true",
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    source: "stripe_webhook",
  };

  if (outcome === "submitted") {
    await capturePostHogEvent({
      distinctId,
      event: "checkout_pay_submitted",
      properties: { ...properties, payment_method: paymentIntent.payment_method_types[0] },
    });
    return;
  }

  const error = paymentIntent.last_payment_error;
  // Lets the payment popup offer the -50 % first month; never worth failing the webhook over.
  const declineCode = error?.decline_code;
  if (declineCode && isDeclineOfferCode(declineCode)) {
    await markCheckoutSessionDeclined(session.id, declineCode).catch((markError) =>
      logError("stripe-webhook/mark-declined", markError, { stripe_object_id: session.id })
    );
  }
  await capturePostHogEvent({
    distinctId,
    event: "checkout_payment_failed",
    properties: {
      ...properties,
      error_code: error?.code,
      decline_code: error?.decline_code,
      wallet: error?.payment_method?.card?.wallet?.type,
    },
  });
}

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    await logError("stripe-webhook", "STRIPE_WEBHOOK_SECRET is missing.");
    return NextResponse.json(
      { error: "Webhook secret is not configured." },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    await logError("stripe-webhook", error, { step: "signature" });
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (!(await claimStripeEvent(event.id, event.type))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      // A delayed payment method (e.g. SEPA) is only paid here: the completed
      // event above arrived unpaid and was skipped by the sync and tracking.
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;

        // The sync returns the account even for a guest checkout, where it is
        // found or created from the email typed in Stripe.
        const userId = await syncProfileFromCheckoutSession(session);

        await trackCheckoutCompleted(
          session,
          userId ?? session.client_reference_id ?? session.metadata?.supabase_user_id ?? null
        );
        break;
      }
      case "checkout.session.async_payment_failed":
        await trackCheckoutPaymentFailed(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncProfileFromSubscription(
          event.data.object as Stripe.Subscription
        );
        break;
      case "payment_intent.created":
        await trackCheckoutPaymentAttempt(
          event.data.object as Stripe.PaymentIntent,
          "submitted"
        );
        break;
      case "payment_intent.payment_failed":
        await trackCheckoutPaymentAttempt(
          event.data.object as Stripe.PaymentIntent,
          "failed"
        );
        break;
      case "invoice.created":
        // Bypass Stripe's ~1h draft window so renewal charges
        // run at the intended time (e.g. 10:10, not ~11:10).
        await chargeSubscriptionInvoiceImmediately(
          event.data.object as Stripe.Invoice
        );
        break;
      default:
        break;
    }
  } catch (error) {
    await releaseStripeEvent(event.id);
    const object = event.data.object as {
      id?: string;
      customer?: string | { id: string } | null;
      client_reference_id?: string | null;
      metadata?: Record<string, string> | null;
    };
    await logError("stripe-webhook", error, {
      userId: object.metadata?.supabase_user_id ?? object.client_reference_id,
      event_type: event.type,
      event_id: event.id,
      stripe_object_id: object.id,
      stripe_customer_id:
        typeof object.customer === "string" ? object.customer : object.customer?.id,
    });
    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
