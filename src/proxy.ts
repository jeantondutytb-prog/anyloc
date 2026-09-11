import { type NextRequest } from "next/server";
import { enforceApiRateLimit } from "@/lib/rate-limit";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const rateLimitResponse = enforceApiRateLimit(request);

  if (rateLimitResponse) {
    return rateLimitResponse;
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
