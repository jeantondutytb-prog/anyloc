import { NextResponse } from "next/server";
import { cancelActiveTrialForUser } from "@/lib/trial-billing";
import { requireAuthenticatedUser } from "@/lib/subscription";

export async function POST() {
  const { user, error } = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    await cancelActiveTrialForUser(user.id);
    return NextResponse.json({ ok: true });
  } catch (cancelError) {
    const message =
      cancelError instanceof Error
        ? cancelError.message
        : "Impossible d'annuler l'essai.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
