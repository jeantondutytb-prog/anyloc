import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  syncProfileFromCheckoutSession,
  syncProfileFromSubscription,
} from "@/lib/billing";
import {
  chargeSubscriptionInvoiceImmediately,
  syncProfileFromTrialSetupSession,
} from "@/lib/trial-billing";
import {
  aliasPostHogUser,
  capturePostHogEvent,
  capturePostHogException,
  parsePostHogDistinctId,
} from "@/lib/posthog/server";
import { stripe } from "@/lib/stripe";
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
    event: session.mode === "setup" ? "trial_start" : "purchase_completed",
    properties: {
      plan_id: session.metadata?.plan_id,
      guest_checkout: session.metadata?.guest_checkout === "true",
      ...(session.mode === "setup"
        ? {}
        : { amount_total: session.amount_total, currency: session.currency }),
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

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is missing.");
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
    console.error("[stripe-webhook]", error);
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
        const userId =
          session.mode === "setup"
            ? await syncProfileFromTrialSetupSession(session)
            : await syncProfileFromCheckoutSession(session);

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
      case "invoice.created":
        // Bypass Stripe's ~1h draft window so trial-end / renewal charges
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
    console.error(`[stripe-webhook] ${event.type}`, error);
    await capturePostHogException({
      distinctId: `stripe:${event.id}`,
      error,
      properties: {
        source: "stripe-webhook",
        event_type: event.type,
      },
    });
    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
