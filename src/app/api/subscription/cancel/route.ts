import { NextResponse } from "next/server";
import { cancelActiveSubscriptionForUser } from "@/lib/account-billing";
import { requireAuthenticatedUser } from "@/lib/subscription";

export async function POST() {
  const { user, error } = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const cancelsAt = await cancelActiveSubscriptionForUser(user.id);
    return NextResponse.json({ ok: true, cancelsAt });
  } catch (cancelError) {
    const message =
      cancelError instanceof Error
        ? cancelError.message
        : "Impossible de résilier l'abonnement.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
