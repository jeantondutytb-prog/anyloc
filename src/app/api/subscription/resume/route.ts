import { NextResponse } from "next/server";
import { resumeSubscriptionForUser } from "@/lib/account-billing";
import { rejectCrossSiteMutation } from "@/lib/csrf";
import { requireAuthenticatedUser } from "@/lib/subscription";

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
    await resumeSubscriptionForUser(user.id);
    return NextResponse.json({ ok: true });
  } catch (resumeError) {
    console.error("[subscription/resume]", resumeError);
    const message =
      resumeError instanceof Error
        ? resumeError.message
        : "Impossible de réactiver l'abonnement.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
