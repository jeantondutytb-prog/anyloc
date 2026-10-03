import { type NextRequest, NextResponse } from "next/server";
import { isSiteUrlOAuthFallback } from "@/lib/oauth";
import {
  ONBOARDING_VARIANT_COOKIE,
  ONBOARDING_VARIANT_MAX_AGE,
  parseOnboardingVariant,
  pickOnboardingVariant,
} from "@/lib/onboarding-experiment";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (isSiteUrlOAuthFallback(request.nextUrl.pathname, request.nextUrl.searchParams)) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  // Draw the onboarding A/B variant on the first visit. It is also put on the
  // request so the page rendered by this very request already sees it.
  const newVariant = parseOnboardingVariant(
    request.cookies.get(ONBOARDING_VARIANT_COOKIE)?.value
  )
    ? null
    : pickOnboardingVariant();
  if (newVariant) {
    request.cookies.set(ONBOARDING_VARIANT_COOKIE, newVariant);
  }

  const response =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? await updateSession(request)
      : NextResponse.next({ request });

  if (newVariant) {
    response.cookies.set(ONBOARDING_VARIANT_COOKIE, newVariant, {
      path: "/",
      maxAge: ONBOARDING_VARIANT_MAX_AGE,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
