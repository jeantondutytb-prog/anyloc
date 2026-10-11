import { NextResponse } from "next/server";
import { logError } from "@/lib/log-error";
import { verifyCheckoutSessionForUser } from "@/lib/stripe-session";
import { requireAuthenticatedUser } from "@/lib/subscription";

export async function GET(request: Request) {
  const { user, error } = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id")?.trim();

  if (!sessionId) {
    return NextResponse.json({ error: "Session manquante." }, { status: 400 });
  }

  try {
    const result = await verifyCheckoutSessionForUser(
      sessionId,
      user.id,
      user.email
    );

    if (!result.verified) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      verified: true,
      planId: result.planId,
    });
  } catch (verifyError) {
    await logError("stripe/verify-session", verifyError, { userId: user.id });
    return NextResponse.json(
      { error: "Impossible de vérifier la session de paiement." },
      { status: 500 }
    );
  }
}
