import { NextResponse } from "next/server";
import { logError } from "@/lib/log-error";
import { PLANS } from "@/lib/constants";
import { publicErrorMessage } from "@/lib/errors";
import { parsePostHogDistinctId } from "@/lib/posthog/server";
import { limitByIp } from "@/lib/rate-limit";
import {
  createSubscriptionCheckoutSession,
  getAuthenticatedCheckoutUser,
} from "@/lib/stripe-checkout";

/**
 * Checkout session behind the paywall's Apple Pay button (A/B test): same
 * customer and metadata as the payment popup, but in `elements` mode, so the
 * page pays it itself with Stripe's Express Checkout Element. Created when
 * the button is shown (and again when the plan changes), which is why the
 * limit is looser than the popup's.
 */
export async function POST(request: Request) {
  const limited = limitByIp(request, "express-checkout", 20, 60_000);
  if (limited) {
    return limited;
  }

  let userId: string | undefined;
  let planId: unknown;

  try {
    const body = await request.json().catch(() => null);
    planId = body?.planId;
    const plan = PLANS.find((item) => item.id === planId);

    if (!plan) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    // Signup comes before the paywall: without an account, the page keeps the popup.
    const user = await getAuthenticatedCheckoutUser();
    userId = user?.id;

    if (!user) {
      return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    }

    const session = await createSubscriptionCheckoutSession({
      plan,
      user,
      analyticsId: parsePostHogDistinctId(body?.analyticsId),
      uiMode: "elements",
      checkoutButtonVariant: "apple_pay_direct",
    });

    if (!session.client_secret) {
      return NextResponse.json(
        { error: "Impossible de démarrer le paiement." },
        { status: 500 }
      );
    }

    return NextResponse.json({ clientSecret: session.client_secret, sessionId: session.id });
  } catch (error) {
    await logError("express-checkout", error, { userId, plan_id: planId });

    const message = publicErrorMessage(error, "Impossible de démarrer le paiement.");

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
