import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { logError } from "@/lib/log-error";
import {
  enrollInCheckoutRecovery,
  getRecoveryCouponForUser,
} from "@/lib/checkout-recovery-server";
import { PLANS } from "@/lib/constants";
import { resolveAnnualExitCoupon } from "@/lib/annual-exit-coupon";
import { CHECKOUT_OFFER_ANNUAL_EXIT } from "@/lib/checkout-offer";
import {
  CHECKOUT_OFFER_BLACK_FRIDAY,
  getBlackFridayCouponId,
  pickCheckoutCoupon,
} from "@/lib/black-friday";
import { capturePostHogEvent, parsePostHogDistinctId } from "@/lib/posthog/server";
import { FIRST_TOUCH_COOKIE, firstTouchProperties, firstTouchMetadata, parseFirstTouch } from "@/lib/first-touch";
import { publicErrorMessage } from "@/lib/errors";
import { limitByIp } from "@/lib/rate-limit";
import {
  createSubscriptionCheckoutSession,
  getAuthenticatedCheckoutUser,
} from "@/lib/stripe-checkout";
import { CHECKOUT_INTENT_COOKIE } from "@/lib/checkout-intent-cookie";
import {
  getPaymentFailedCheckoutBlock,
  paymentFailedCheckoutResponse,
} from "@/lib/checkout-payment-failed-guard";

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
    // Where the buyer first came from (UTM, sending site): kept since the first visit.
    const firstTouch = parseFirstTouch((await cookies()).get(FIRST_TOUCH_COOKIE)?.value);
    // A failed renewal is fixed with a new card, never with a 2nd subscription.
    const paymentFailedBlock = getPaymentFailedCheckoutBlock(user?.id);

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
    // Black Friday (-20 % on the 1st payment) only when no bigger discount
    // applies: never two coupons (see lib/black-friday).
    const pickPromise = annualExitCoupon
      ? Promise.resolve({ couponId: annualExitCoupon, blackFriday: false })
      : Promise.resolve(user ? getRecoveryCouponForUser(user.id, plan.id) : null).then(
          (existing) =>
            pickCheckoutCoupon({
              planId: plan.id,
              existing,
              blackFridayCouponId: getBlackFridayCouponId(),
              now: new Date(),
            })
        );
    const couponPromise = pickPromise.then((pick) => pick.couponId);
    const checkoutOfferPromise = pickPromise.then((pick) =>
      annualExitCoupon
        ? CHECKOUT_OFFER_ANNUAL_EXIT
        : pick.blackFriday
          ? CHECKOUT_OFFER_BLACK_FRIDAY
          : null
    );

    // The paywall's "Continuer" button: Stripe-hosted payment page.
    // Checked alongside the session (no added wait for a normal buyer); a
    // refused session is never handed out and simply expires unused.
    const [session, block] = await Promise.all([
      createSubscriptionCheckoutSession({
        plan,
        user,
        analyticsId,
        uiMode: "hosted_page",
        firstTouch,
        couponId: couponPromise,
        offer: checkoutOfferPromise,
      }),
      paymentFailedBlock,
    ]);
    if (block.blocked) {
      return paymentFailedCheckoutResponse();
    }
    const [couponId, checkoutOffer] = await Promise.all([couponPromise, checkoutOfferPromise]);
    const blackFriday = checkoutOffer === CHECKOUT_OFFER_BLACK_FRIDAY;

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
            recovery_offer: Boolean(couponId) && !annualExitCoupon && !blackFriday,
            offer: checkoutOffer,
            ...firstTouchProperties(firstTouchMetadata(firstTouch)),
          },
        });
        if (blackFriday) {
          await capturePostHogEvent({
            distinctId: user?.id ?? analyticsId ?? session.id,
            event: "black_friday_offer_applied",
            properties: { plan: plan.id, ui_mode: "hosted" },
          });
        }
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
