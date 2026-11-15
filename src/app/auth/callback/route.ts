import { type NextRequest, NextResponse } from "next/server";
import { resolvePostAuthRedirect } from "@/lib/auth-redirect";
import { trackGoogleSignup } from "@/lib/google-signup";
import { logError } from "@/lib/log-error";
import {
  clearOAuthNextCookie,
  clearOAuthStartedCookie,
  getRequestOrigin,
  readOAuthNext,
  readOAuthStartedAt,
} from "@/lib/oauth";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";
import {
  createCookieCollector,
  createRouteHandlerClient,
} from "@/lib/supabase/route-handler";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const oauthError = new URL("/login?error=oauth", origin);
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = readOAuthNext(request, "/dashboard");

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(oauthError);
  }

  let userId: string | undefined;

  try {
    const collector = createCookieCollector();
    const supabase = createRouteHandlerClient(request, collector);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      await logError("auth/callback", error, { step: "exchange_code" });
      return NextResponse.redirect(oauthError);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id;

    if (user) {
      // First Google signup only: a reconnection sends nothing. Analytics
      // must never block the login, so a PostHog failure is just logged.
      await trackGoogleSignup(user, readOAuthStartedAt(request)).catch((trackError) =>
        logError("auth/callback", trackError, { userId, step: "track_google_signup" })
      );
    }

    const destination = user
      ? await resolvePostAuthRedirect(user.id, user.email, requestedNext)
      : sanitizeRedirectPath(requestedNext, "/dashboard");

    const response = NextResponse.redirect(new URL(destination, origin));
    collector.applyTo(response);
    clearOAuthNextCookie(response, request);
    clearOAuthStartedCookie(response, request);
    return response;
  } catch (error) {
    await logError("auth/callback", error, { userId, step: "unexpected" });
    return NextResponse.redirect(oauthError);
  }
}
