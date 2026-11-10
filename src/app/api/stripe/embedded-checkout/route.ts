import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { logError } from "@/lib/log-error";
import {
  enrollInCheckoutRecovery,
  getRecoveryCouponForUser,
} from "@/lib/checkout-recovery-server";
import { CLOSE_OFFER_COOKIE, parseCloseOfferVariant } from "@/lib/checkout-first-month-offer";
import { getFirstMonthOfferCoupon } from "@/lib/checkout-first-month-offer-server";
import { PLANS } from "@/lib/constants";
import { isAnnualExitOfferEnabled } from "@/lib/annual-exit-offer";
import { getAnnualExitOfferCoupon } from "@/lib/annual-exit-offer-server";
import { CHECKOUT_OFFER_ANNUAL_EXIT } from "@/lib/checkout-offer";
import { capturePostHogEvent, parsePostHogDistinctId } from "@/lib/posthog/server";
import { publicErrorMessage } from "@/lib/errors";
import { limitByIp } from "@/lib/rate-limit";
import {
  createSubscriptionCheckoutSession,
  getAuthenticatedCheckoutUser,
} from "@/lib/stripe-checkout";

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
    // The earlier checkout refused for lack of funds (or closed, in the A/B
    // test) that this one comes from: -50 % on the 1st month.
    const offerSessionId = typeof body?.offerSessionId === "string" ? body.offerSessionId : null;
    const closeOfferVariant = parseCloseOfferVariant((await cookies()).get(CLOSE_OFFER_COOKIE)?.value);

    // The annual exit offer: checked here, never trusted from the browser.
    // It wins over the -50 % and the recovery coupon (never two discounts).
    let annualExitCoupon: string | null = null;
    if (body?.annualExitOffer === true) {
      if (!user) {
        return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
      }
      annualExitCoupon = isAnnualExitOfferEnabled()
        ? await getAnnualExitOfferCoupon(user.id, plan.id)
        : null;
      if (!annualExitCoupon) {
        return NextResponse.json({ error: "Cette offre a expiré." }, { status: 409 });
      }
    }

    // Looked up while Stripe finds the customer: every round trip delays the payment form.
    const offerPromise =
      offerSessionId && !annualExitCoupon
        ? getFirstMonthOfferCoupon(offerSessionId, plan.id, closeOfferVariant)
        : Promise.resolve(null);
    const couponPromise = annualExitCoupon
      ? Promise.resolve(annualExitCoupon)
      : offerPromise.then(
          (offer) => offer?.couponId ?? (user ? getRecoveryCouponForUser(user.id, plan.id) : null)
        );

    const session = await createSubscriptionCheckoutSession({
      plan,
      user,
      analyticsId,
      uiMode: "embedded_page",
      couponId: couponPromise,
      offer: annualExitCoupon ? CHECKOUT_OFFER_ANNUAL_EXIT : null,
    });
    const [couponId, offer] = await Promise.all([couponPromise, offerPromise]);

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
            ui_mode: "embedded",
            checkout_variant: "direct",
            recovery_offer: Boolean(couponId) && !offer && !annualExitCoupon,
            first_month_offer: offer?.reason ?? null,
            offer: annualExitCoupon ? CHECKOUT_OFFER_ANNUAL_EXIT : null,
          },
        });
      } catch (error) {
        await logError("embedded-checkout/after", error, { userId, plan_id: plan.id });
      }
    });

    if (!session.client_secret) {
      return NextResponse.json(
        { error: "Impossible de démarrer le paiement." },
        { status: 500 }
      );
    }

    return NextResponse.json({ clientSecret: session.client_secret, sessionId: session.id });
  } catch (error) {
    await logError("embedded-checkout", error, { userId, plan_id: planId });

    const message = publicErrorMessage(error, "Impossible de démarrer le paiement.");

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
