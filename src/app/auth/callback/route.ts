import { type NextRequest, NextResponse } from "next/server";
import { resolvePostAuthRedirect } from "@/lib/auth-redirect";
import { ensureStripeCustomerForUser } from "@/lib/billing";
import { clearOAuthNextCookie, getRequestOrigin, readOAuthNext } from "@/lib/oauth";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";
import {
  createCookieCollector,
  createRouteHandlerClient,
} from "@/lib/supabase/route-handler";

export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = readOAuthNext(request, "/dashboard");

  if (code) {
    const collector = createCookieCollector();
    const supabase = createRouteHandlerClient(request, collector);
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

      const response = NextResponse.redirect(new URL(destination, origin));
      collector.applyTo(response);
      clearOAuthNextCookie(response, request);
      return response;
    }

    console.error("[auth/callback] Failed to exchange OAuth code:", error.message);
  }

  return NextResponse.redirect(new URL("/login?error=oauth", origin));
}
