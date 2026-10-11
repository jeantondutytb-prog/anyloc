import { NextResponse } from "next/server";
import { cancelActiveSubscriptionForUser } from "@/lib/account-billing";
import { rejectCrossSiteMutation } from "@/lib/csrf";
import { requireAuthenticatedUser } from "@/lib/subscription";
import { publicErrorMessage } from "@/lib/errors";

export async function POST(request: Request) {
  const crossSiteResponse = rejectCrossSiteMutation(request);
  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const { user, error } = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const cancelsAt = await cancelActiveSubscriptionForUser(user.id);
    return NextResponse.json({ ok: true, cancelsAt });
  } catch (cancelError) {
    console.error("[trial/cancel]", cancelError);
    const message = publicErrorMessage(cancelError, "Impossible de résilier l'abonnement.");

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
