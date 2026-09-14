import { NextResponse } from "next/server";
import { PLANS } from "@/lib/constants";
import { capturePostHogEvent } from "@/lib/posthog/server";
import {
  createSubscriptionCheckoutSession,
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

    const session = await createSubscriptionCheckoutSession({
      plan,
      user,
      uiMode: "hosted_page",
    });

    await capturePostHogEvent({
      distinctId: user?.id ?? session.id,
      event: "checkout_started",
      properties: { plan: plan.id, guest_checkout: !user },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Impossible de démarrer le paiement." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[checkout]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Impossible de démarrer le paiement.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
