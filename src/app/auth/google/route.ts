import { type NextRequest, NextResponse } from "next/server";
import { ONBOARDING_ENTRY_URL } from "@/lib/constants";
import {
  buildOAuthStartUrl,
  getOAuthCallbackUrl,
  getRequestOrigin,
  readOAuthNext,
  setOAuthNextCookie,
  shouldBounceToOAuthOrigin,
} from "@/lib/oauth";
import {
  createCookieCollector,
  createRouteHandlerClient,
} from "@/lib/supabase/route-handler";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const next = readOAuthNext(request, ONBOARDING_ENTRY_URL);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  // Stay on the allowlisted Site URL (www vs apex). PKCE cookies must be
  // written on the same host as the callback, otherwise Google returns to `/`.
  if (shouldBounceToOAuthOrigin(request)) {
    return NextResponse.redirect(buildOAuthStartUrl(request, next));
  }

  const collector = createCookieCollector();
  const supabase = createRouteHandlerClient(request, collector);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // No query string — Supabase redirect URLs are exact matches.
      // The post-auth destination is stored in a cookie instead.
      redirectTo: getOAuthCallbackUrl(request),
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  const response = NextResponse.redirect(data.url);
  collector.applyTo(response);
  setOAuthNextCookie(response, next, request);
  return response;
}
