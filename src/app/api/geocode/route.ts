import { searchNominatimPlaces } from "@/lib/nominatim-geocoding";
import { searchPhotonPlaces } from "@/lib/photon-geocoding";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return Response.json({ results: [] });
  }

  try {
    const nominatimResults = await searchNominatimPlaces(query);

    if (nominatimResults.length > 0) {
      return Response.json({ results: nominatimResults, source: "nominatim" });
    }

    const photonResults = await searchPhotonPlaces(query);
    return Response.json({ results: photonResults, source: "photon-fallback" });
  } catch (error) {
    console.error("[geocode] Search failed:", error);
    return Response.json(
      { error: "Impossible de rechercher cette ville." },
      { status: 500 }
    );
  }
}
