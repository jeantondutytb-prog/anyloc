import { NextResponse } from "next/server";
import { cancelActiveTrialForUser } from "@/lib/trial-billing";
import { requireAuthenticatedUser } from "@/lib/subscription";
import { publicErrorMessage } from "@/lib/errors";

export async function POST() {
  const { user, error } = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    await cancelActiveTrialForUser(user.id);
    return NextResponse.json({ ok: true });
  } catch (cancelError) {
    console.error("[trial/cancel]", cancelError);
    const message = publicErrorMessage(cancelError, "Impossible de résilier l'abonnement.");

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
