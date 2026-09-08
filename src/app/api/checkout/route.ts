import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { PLANS } from "@/lib/constants";

export async function POST(request: Request) {
  const { planId } = await request.json();
  const plan = PLANS.find((p) => p.id === planId);

  if (!plan) {
    return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
  }

  if (!stripe || !plan.stripePriceId) {
    return NextResponse.json({ url: null });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
  });

  return NextResponse.json({ url: session.url });
}
