import { getDestinationSocialProofFromDatabase } from "@/lib/onboarding-social-proof-server";
import { TRENDING_DESTINATIONS } from "@/lib/onboarding-destinations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();

  if (!city) {
    return Response.json({ error: "Paramètre city requis." }, { status: 400 });
  }

  const destination =
    TRENDING_DESTINATIONS.find((item) => item.city === city) ?? {
      id: city,
      city,
      area: "",
      emoji: "📍",
      lat: 0,
      lng: 0,
    };

  const proof = await getDestinationSocialProofFromDatabase(destination);

  return Response.json(proof);
}
