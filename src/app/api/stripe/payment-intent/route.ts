import { NextResponse } from "next/server";
import { PLANS } from "@/lib/constants";
import {
  createSubscriptionPaymentIntent,
  getAuthenticatedCheckoutUser,
} from "@/lib/stripe-checkout";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const planId = body?.planId;

    if (typeof planId !== "string") {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    const plan = PLANS.find((item) => item.id === planId);

    if (!plan) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    const user = await getAuthenticatedCheckoutUser();

    if (!user) {
      return NextResponse.json(
        { error: "Connecte-toi pour continuer." },
        { status: 401 }
      );
    }

    const { clientSecret, subscriptionId } =
      await createSubscriptionPaymentIntent({
        plan,
        user,
      });

    return NextResponse.json({ clientSecret, subscriptionId });
  } catch (error) {
    console.error("[payment-intent]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Impossible de démarrer le paiement.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
