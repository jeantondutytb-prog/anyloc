import { NextResponse } from "next/server";
import { syncProfileFromCheckoutSession } from "@/lib/billing";
import { syncProfileFromTrialSetupSession } from "@/lib/trial-billing";
import { CHECKOUT_INTENT_COOKIE } from "@/lib/checkout-intent-cookie";
import { redeemCheckoutSession, sendMagicLinkEmail } from "@/lib/guest-account";
import { getAppUrl, stripe } from "@/lib/stripe";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { limitByIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const limited = limitByIp(request, "checkout-complete", 10, 60_000);
  if (limited) {
    return limited;
  }

  const { searchParams, origin } = new URL(request.url);
  const sessionId = searchParams.get("session_id")?.trim();

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.redirect(new URL("/login?error=checkout", origin));
  }

  if (!stripe) {
    return NextResponse.redirect(new URL("/login?error=stripe", origin));
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const isTrialSetup = session.mode === "setup";
    const isComplete =
      session.status === "complete" &&
      (session.payment_status === "paid" ||
        session.payment_status === "no_payment_required" ||
        isTrialSetup);

    if (!isComplete) {
      return NextResponse.redirect(new URL("/checkout?canceled=true", origin));
    }

    const email =
      session.customer_details?.email?.trim() ??
      session.customer_email?.trim() ??
      null;

    if (!email) {
      return NextResponse.redirect(new URL("/login?error=checkout-email", origin));
    }

    if (isTrialSetup) {
      await syncProfileFromTrialSetupSession(session);
    } else {
      await syncProfileFromCheckoutSession(session);
    }

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const sessionUserId =
        session.client_reference_id ?? session.metadata?.supabase_user_id;

      if (user?.id && sessionUserId && user.id === sessionUserId) {
        return NextResponse.redirect(
          new URL("/dashboard?success=true", origin)
        );
      }
    }

    // The checkout email is typed by the payer and never verified by Stripe,
    // so it can belong to someone else's existing account. Never log this
    // browser in from it: email the link to the account's own inbox.
    const redirectTo = `${getAppUrl()}/dashboard?success=true`;
    if (await redeemCheckoutSession(session.id)) {
      await sendMagicLinkEmail(email, redirectTo);
    }
    const response = NextResponse.redirect(
      new URL("/login?checkout=email-sent", origin)
    );
    response.cookies.delete({
      name: CHECKOUT_INTENT_COOKIE,
      path: "/auth/checkout-complete",
    });
    return response;
  } catch (error) {
    console.error("[auth/checkout-complete]", error);
    return NextResponse.redirect(new URL("/login?error=checkout-complete", origin));
  }
}
