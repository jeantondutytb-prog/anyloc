import { NextResponse } from "next/server";
import {
  enrollInCheckoutRecovery,
  getRecoveryCouponForUser,
} from "@/lib/checkout-recovery-server";
import { PLANS } from "@/lib/constants";
import { capturePostHogEvent, parsePostHogDistinctId } from "@/lib/posthog/server";
import {
  createSubscriptionCheckoutSession,
  getAuthenticatedCheckoutUser,
} from "@/lib/stripe-checkout";
import { CHECKOUT_INTENT_COOKIE } from "@/lib/checkout-intent-cookie";

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
    const analyticsId = parsePostHogDistinctId(body?.analyticsId);

    const couponId = user ? await getRecoveryCouponForUser(user.id, plan.id) : null;

    // The paywall's "Continuer" button: Stripe-hosted payment page.
    const session = await createSubscriptionCheckoutSession({
      plan,
      user,
      analyticsId,
      uiMode: "hosted_page",
      couponId,
    });

    if (user) {
      await enrollInCheckoutRecovery(user, plan.id);
    }

    await capturePostHogEvent({
      distinctId: user?.id ?? analyticsId ?? session.id,
      event: "checkout_started",
      properties: {
        plan: plan.id,
        guest_checkout: !user,
        ui_mode: "hosted",
        checkout_variant: "direct",
        recovery_offer: Boolean(couponId),
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Impossible de démarrer le paiement." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ url: session.url });

    if (!user) {
      response.cookies.set(CHECKOUT_INTENT_COOKIE, session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/auth/checkout-complete",
        maxAge: 60 * 60,
      });
    }

    return response;
  } catch (error) {
    console.error("[checkout]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Impossible de démarrer le paiement.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
