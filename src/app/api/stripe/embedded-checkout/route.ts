import { NextResponse } from "next/server";
import { PLANS } from "@/lib/constants";
import { getAppUrl, stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const { planId } = await request.json();
  const plan = PLANS.find((item) => item.id === planId);

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
    ui_mode: "embedded",
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    return_url: `${appUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
  });

  if (!session.client_secret) {
    return NextResponse.json(
      { error: "Impossible de démarrer le paiement." },
      { status: 500 }
    );
  }

  return NextResponse.json({ clientSecret: session.client_secret });
}
