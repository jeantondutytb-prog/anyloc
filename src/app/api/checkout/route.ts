import { after, NextResponse } from "next/server";
import { logError } from "@/lib/log-error";
import {
  enrollInCheckoutRecovery,
  getRecoveryCouponForUser,
} from "@/lib/checkout-recovery-server";
import { PLANS } from "@/lib/constants";
import { resolveAnnualExitCoupon } from "@/lib/annual-exit-coupon";
import { CHECKOUT_OFFER_ANNUAL_EXIT } from "@/lib/checkout-offer";
import { capturePostHogEvent, parsePostHogDistinctId } from "@/lib/posthog/server";
import { publicErrorMessage } from "@/lib/errors";
import { limitByIp } from "@/lib/rate-limit";
import {
  createSubscriptionCheckoutSession,
  getAuthenticatedCheckoutUser,
} from "@/lib/stripe-checkout";
import { CHECKOUT_INTENT_COOKIE } from "@/lib/checkout-intent-cookie";

export async function POST(request: Request) {
  const limited = limitByIp(request, "checkout", 10, 60_000);
  if (limited) {
    return limited;
  }

  let userId: string | undefined;
  let planId: unknown;

  try {
    const body = await request.json().catch(() => null);
    planId = body?.planId;

    if (typeof planId !== "string") {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    const plan = PLANS.find((item) => item.id === planId);

    if (!plan) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    const user = await getAuthenticatedCheckoutUser();
    userId = user?.id;
    const analyticsId = parsePostHogDistinctId(body?.analyticsId);

    // The annual exit offer: checked here, never trusted from the browser.
    // It wins over the recovery coupon (never two discounts).
    const gate = await resolveAnnualExitCoupon({
      requested: body?.annualExitOffer === true,
      userId: user?.id ?? null,
      planId: plan.id,
    });
    if (gate.kind === "error") {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }
    const annualExitCoupon = gate.kind === "coupon" ? gate.couponId : null;

    // Looked up while Stripe finds the customer: every round trip delays the payment form.
    const couponPromise = annualExitCoupon
      ? Promise.resolve(annualExitCoupon)
      : user
        ? getRecoveryCouponForUser(user.id, plan.id)
        : null;

    // The paywall's "Continuer" button: Stripe-hosted payment page.
    const session = await createSubscriptionCheckoutSession({
      plan,
      user,
      analyticsId,
      uiMode: "hosted_page",
      couponId: couponPromise,
      offer: annualExitCoupon ? CHECKOUT_OFFER_ANNUAL_EXIT : null,
    });
    const couponId = await couponPromise;

    // Bookkeeping that the customer doesn't wait for: sent once the response is out.
    after(async () => {
      try {
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
            recovery_offer: Boolean(couponId) && !annualExitCoupon,
            offer: annualExitCoupon ? CHECKOUT_OFFER_ANNUAL_EXIT : null,
          },
        });
      } catch (error) {
        await logError("checkout/after", error, { userId, plan_id: plan.id });
      }
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
    await logError("checkout", error, { userId, plan_id: planId });

    const message = publicErrorMessage(error, "Impossible de démarrer le paiement.");

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
