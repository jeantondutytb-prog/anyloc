import { NextResponse } from "next/server";
import { rejectCrossSiteMutation } from "@/lib/csrf";
import { capturePostHogEvent } from "@/lib/posthog/server";
import { acceptRetentionOffer, getRetentionOfferForUser } from "@/lib/retention-offer";
import { requireAuthenticatedUser } from "@/lib/subscription";

export async function GET() {
  const { user, error } = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    return NextResponse.json(await getRetentionOfferForUser(user.id));
  } catch (offerError) {
    console.error("[retention-offer] Eligibility check failed:", offerError);
    return NextResponse.json({ eligible: false });
  }
}

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
    const offer = await acceptRetentionOffer(user.id);

    if (!offer) {
      return NextResponse.json(
        { error: "Cette offre n'est plus disponible sur ton abonnement." },
        { status: 409 }
      );
    }

    await capturePostHogEvent({
      distinctId: user.id,
      event: "retention_offer_accepted",
      properties: { offer: offer.kind },
    });

    return NextResponse.json({ ok: true, label: offer.label });
  } catch (offerError) {
    console.error("[retention-offer] Apply failed:", offerError);
    return NextResponse.json(
      { error: "Impossible d'appliquer l'offre. Réessaie ou écris-nous sur le chat." },
      { status: 500 }
    );
  }
}
