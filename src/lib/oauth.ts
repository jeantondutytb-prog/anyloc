import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ONBOARDING_ENTRY_URL } from "@/lib/constants";
import { getRequestOrigin } from "@/lib/oauth-origin";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";

export {
  getConfiguredAppOrigin,
  getOAuthCallbackOrigin,
  getOAuthCallbackUrl,
  getRequestOrigin,
  isSiteUrlOAuthFallback,
  normalizeOrigin,
} from "@/lib/oauth-origin";

export const OAUTH_NEXT_COOKIE = "anyloc_oauth_next";

const OAUTH_NEXT_MAX_AGE_SECONDS = 60 * 10;

export function readOAuthNext(
  request: NextRequest,
  fallback = ONBOARDING_ENTRY_URL
) {
  return sanitizeRedirectPath(
    request.nextUrl.searchParams.get("next") ??
      request.cookies.get(OAUTH_NEXT_COOKIE)?.value,
    fallback
  );
}

export function oauthNextCookieOptions(request: Request) {
  const hostname = new URL(getRequestOrigin(request)).hostname.toLowerCase();
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: !isLocal,
    path: "/",
    maxAge: OAUTH_NEXT_MAX_AGE_SECONDS,
  };
}

export function setOAuthNextCookie(
  response: NextResponse,
  next: string,
  request: Request
) {
  response.cookies.set(OAUTH_NEXT_COOKIE, next, oauthNextCookieOptions(request));
}

export function clearOAuthNextCookie(response: NextResponse, request: Request) {
  response.cookies.set(OAUTH_NEXT_COOKIE, "", {
    ...oauthNextCookieOptions(request),
    maxAge: 0,
  });
}
