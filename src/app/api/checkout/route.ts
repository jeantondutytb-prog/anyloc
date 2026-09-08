import { NextResponse } from "next/server";
import { stripe, getAppUrl } from "@/lib/stripe";
import { PLANS } from "@/lib/constants";

export async function POST(request: Request) {
  const { planId } = await request.json();
  const plan = PLANS.find((p) => p.id === planId);

  if (!plan) {
    return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
  }

  if (!stripe || !plan.stripePriceId) {
    return NextResponse.json(
      { error: "Paiement non configuré pour ce plan" },
      { status: 503 }
    );
  }

  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?success=true`,
    cancel_url: `${appUrl}/checkout?plan=${plan.id}&canceled=true`,
    subscription_data: {
      trial_period_days: 3,
    },
  });

  return NextResponse.json({ url: session.url });
}
