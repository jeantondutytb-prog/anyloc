import { NextResponse } from "next/server";
import { resolvePostAuthRedirect } from "@/lib/auth-redirect";
import { ensureStripeCustomerForUser } from "@/lib/billing";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");

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

      const destination = user
        ? await resolvePostAuthRedirect(user.id, user.email, requestedNext)
        : sanitizeRedirectPath(requestedNext, "/dashboard");

      return NextResponse.redirect(new URL(destination, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=oauth", origin));
}
