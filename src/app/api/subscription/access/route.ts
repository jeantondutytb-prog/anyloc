import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildSubscriptionAccessResponse } from "@/lib/subscription-access-api";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim() || null;
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const accessToken = extractBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Authorization Bearer token requis." },
      { status: 401 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  const payload = await buildSubscriptionAccessResponse(user.id, user.email);

  return NextResponse.json(payload);
}
