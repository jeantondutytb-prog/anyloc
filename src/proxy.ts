import { type NextRequest, NextResponse } from "next/server";
import { isSiteUrlOAuthFallback } from "@/lib/oauth";
import {
  isOnboardingExperimentEnabled,
  ONBOARDING_VARIANT_COOKIE,
  ONBOARDING_VARIANT_MAX_AGE,
  parseOnboardingVariant,
  pickOnboardingVariant,
} from "@/lib/onboarding-experiment";
import {
  isPricingExperimentEnabled,
  parsePricingVariant,
  pickPricingVariant,
  PRICING_VARIANT_COOKIE,
  PRICING_VARIANT_MAX_AGE,
} from "@/lib/pricing-experiment";
import {
  parsePriceDisplayVariant,
  pickPriceDisplayVariant,
  PRICE_DISPLAY_COOKIE,
  PRICE_DISPLAY_MAX_AGE,
} from "@/lib/price-display-experiment";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (isSiteUrlOAuthFallback(request.nextUrl.pathname, request.nextUrl.searchParams)) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  // Draw the pricing A/B variant on the first visit. It is also put on the
  // request so the page rendered by this very request already sees it.
  const newVariant =
    isPricingExperimentEnabled() &&
    !parsePricingVariant(request.cookies.get(PRICING_VARIANT_COOKIE)?.value)
      ? pickPricingVariant()
      : null;
  if (newVariant) {
    request.cookies.set(PRICING_VARIANT_COOKIE, newVariant);
  }
  // Same for the onboarding A/B test, drawn independently of the price grid.
  const newOnboardingVariant =
    isOnboardingExperimentEnabled() &&
    !parseOnboardingVariant(request.cookies.get(ONBOARDING_VARIANT_COOKIE)?.value)
      ? pickOnboardingVariant()
      : null;
  if (newOnboardingVariant) {
    request.cookies.set(ONBOARDING_VARIANT_COOKIE, newOnboardingVariant);
  }
  // And for the checkout price display (per day or per month).
  const newPriceDisplayVariant = !parsePriceDisplayVariant(
    request.cookies.get(PRICE_DISPLAY_COOKIE)?.value
  )
    ? pickPriceDisplayVariant()
    : null;
  if (newPriceDisplayVariant) {
    request.cookies.set(PRICE_DISPLAY_COOKIE, newPriceDisplayVariant);
  }

  const response =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? await updateSession(request)
      : NextResponse.next({ request });

  if (newVariant) {
    response.cookies.set(PRICING_VARIANT_COOKIE, newVariant, {
      path: "/",
      maxAge: PRICING_VARIANT_MAX_AGE,
      sameSite: "lax",
    });
  }

  if (newOnboardingVariant) {
    response.cookies.set(ONBOARDING_VARIANT_COOKIE, newOnboardingVariant, {
      path: "/",
      maxAge: ONBOARDING_VARIANT_MAX_AGE,
      sameSite: "lax",
    });
  }

  if (newPriceDisplayVariant) {
    response.cookies.set(PRICE_DISPLAY_COOKIE, newPriceDisplayVariant, {
      path: "/",
      maxAge: PRICE_DISPLAY_MAX_AGE,
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
