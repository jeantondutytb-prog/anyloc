import { NextResponse } from "next/server";
import { syncProfileFromCheckoutSession } from "@/lib/billing";
import { createMagicLinkRedirectUrl } from "@/lib/guest-account";
import { getAppUrl, stripe } from "@/lib/stripe";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
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

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.redirect(new URL("/checkout?canceled=true", origin));
    }

    const email =
      session.customer_details?.email?.trim() ??
      session.customer_email?.trim() ??
      null;

    if (!email) {
      return NextResponse.redirect(new URL("/login?error=checkout-email", origin));
    }

    await syncProfileFromCheckoutSession(session);

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const sessionUserId =
        session.client_reference_id ?? session.metadata?.supabase_user_id;

      if (user?.id && sessionUserId && user.id === sessionUserId) {
        return NextResponse.redirect(
          new URL("/dashboard/installation?success=true", origin)
        );
      }
    }

    const magicLink = await createMagicLinkRedirectUrl(
      email,
      `${getAppUrl()}/dashboard/installation?success=true`
    );

    return NextResponse.redirect(magicLink);
  } catch (error) {
    console.error("[auth/checkout-complete]", error);
    return NextResponse.redirect(new URL("/login?error=checkout-complete", origin));
  }
}
