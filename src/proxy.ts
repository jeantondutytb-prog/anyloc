import { type NextRequest, NextResponse } from "next/server";
import { isSiteUrlOAuthFallback } from "@/lib/oauth";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (isSiteUrlOAuthFallback(request.nextUrl.pathname, request.nextUrl.searchParams)) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return;
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
