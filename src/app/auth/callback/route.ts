import { NextResponse } from "next/server";
import { ensureStripeCustomerForUser } from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        try {
          await ensureStripeCustomerForUser({
            userId: user.id,
            email: user.email,
          });
        } catch (linkError) {
          console.error("[auth/callback] Failed to create Stripe customer:", linkError);
        }
      }

      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=oauth", origin));
}
