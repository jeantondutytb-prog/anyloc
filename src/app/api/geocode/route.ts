import { searchGooglePlaces } from "@/lib/google-places";
import { searchPhotonPlaces } from "@/lib/photon-geocoding";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return Response.json({ results: [] });
  }

  try {
    const googleResults = await searchGooglePlaces(query);

    if (googleResults.length > 0) {
      return Response.json({ results: googleResults, source: "google" });
    }

    const photonResults = await searchPhotonPlaces(query);
    return Response.json({
      results: photonResults,
      source: process.env.GOOGLE_MAPS_API_KEY ? "photon-fallback" : "photon",
    });
  } catch (error) {
    console.error("[geocode] Search failed:", error);
    return Response.json(
      { error: "Impossible de rechercher cette ville." },
      { status: 500 }
    );
  }
}
