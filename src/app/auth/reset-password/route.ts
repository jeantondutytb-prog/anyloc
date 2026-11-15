import { type NextRequest, NextResponse } from "next/server";
import { getRequestOrigin } from "@/lib/oauth";
import {
  isPlausibleTokenHash,
  RESET_TOKEN_COOKIE,
  RESET_TOKEN_MAX_AGE_SECONDS,
} from "@/lib/password-reset";

/**
 * Link from the "mot de passe oublié" email. Only keeps the token in a
 * short-lived cookie and moves on to a clean /reset-password: a mail scanner
 * that opens the link spends nothing, and the token never reaches the address
 * bar, the history or the analytics.
 */
export function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const response = NextResponse.redirect(new URL("/reset-password", origin));
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");

  if (isPlausibleTokenHash(tokenHash)) {
    response.cookies.set(RESET_TOKEN_COOKIE, tokenHash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: RESET_TOKEN_MAX_AGE_SECONDS,
    });
  }

  return response;
}
