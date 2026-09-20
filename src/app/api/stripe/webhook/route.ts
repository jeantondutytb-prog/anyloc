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
import { capturePostHogEvent, capturePostHogException } from "@/lib/posthog/server";
import { stripe } from "@/lib/stripe";
import {
  hasProcessedStripeEvent,
  markStripeEventProcessed,
} from "@/lib/webhook-idempotency";

export const runtime = "nodejs";

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
    const message =
      error instanceof Error ? error.message : "Invalid webhook signature.";
    console.error("[stripe-webhook]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (await hasProcessedStripeEvent(event.id)) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "setup") {
          await syncProfileFromTrialSetupSession(session);

          const userId =
            session.client_reference_id ?? session.metadata?.supabase_user_id;

          if (userId) {
            await capturePostHogEvent({
              distinctId: userId,
              event: "trial_start",
              properties: {
                plan_id: session.metadata?.plan_id,
              },
            });
          }
        } else {
          await syncProfileFromCheckoutSession(session);

          const userId =
            session.client_reference_id ?? session.metadata?.supabase_user_id;

          if (userId) {
            await capturePostHogEvent({
              distinctId: userId,
              event: "purchase_completed",
              properties: {
                amount_total: session.amount_total,
                currency: session.currency,
              },
            });
          }
        }
        break;
      }
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

    await markStripeEventProcessed(event.id, event.type);
  } catch (error) {
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
