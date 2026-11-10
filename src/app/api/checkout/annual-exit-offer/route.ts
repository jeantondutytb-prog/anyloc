import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ANNUAL_EXIT_OFFER_COOKIE,
  isAnnualExitOfferEnabled,
  parseAnnualExitOfferVariant,
} from "@/lib/annual-exit-offer";
import { ANNUAL_EXIT_COUPON_ID, startAnnualExitOffer } from "@/lib/annual-exit-offer-server";
import { logError } from "@/lib/log-error";
import { limitByIp } from "@/lib/rate-limit";
import { getAuthenticatedCheckoutUser } from "@/lib/stripe-checkout";

/** First display of the annual exit offer: starts the 2 h window and returns its end. */
export async function POST(request: Request) {
  const limited = limitByIp(request, "annual-exit-offer", 10, 60_000);
  if (limited) {
    return limited;
  }

  let userId: string | undefined;

  try {
    const user = await getAuthenticatedCheckoutUser();
    userId = user?.id;

    if (!user) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }

    const variant = parseAnnualExitOfferVariant((await cookies()).get(ANNUAL_EXIT_OFFER_COOKIE)?.value);

    if (!isAnnualExitOfferEnabled() || !ANNUAL_EXIT_COUPON_ID || variant !== "offer") {
      return NextResponse.json({ error: "Offre indisponible" }, { status: 404 });
    }

    const offer = await startAnnualExitOffer(user.id);

    if (!offer) {
      return NextResponse.json({ error: "Offre indisponible" }, { status: 404 });
    }

    return NextResponse.json({ expiresAt: offer.expiresAt.toISOString() });
  } catch (error) {
    await logError("annual-exit-offer", error, { userId });

    return NextResponse.json({ error: "Impossible de démarrer l'offre." }, { status: 500 });
  }
}
