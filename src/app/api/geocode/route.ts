import {
  formatCoordinateLabel,
  parseCoordinatesFromQuery,
  stripCoordinatesFromQuery,
} from "@/lib/coordinate-query";
import {
  mergeGeocodeResults,
  reverseNominatimPlace,
  searchNominatimPlaces,
} from "@/lib/nominatim-geocoding";
import { searchPhotonPlaces } from "@/lib/photon-geocoding";
import { limitByIp } from "@/lib/rate-limit";

// Same query, same answer: let Vercel's CDN serve repeats instead of
// hitting Nominatim (1 request/second policy) again.
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

export async function GET(request: Request) {
  const limited = limitByIp(request, "geocode", 30, 60_000);
  if (limited) {
    return limited;
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return Response.json({ results: [] });
  }

  try {
    const coordinates = parseCoordinatesFromQuery(query);
    const textQuery = stripCoordinatesFromQuery(query);
    let results: Awaited<ReturnType<typeof searchNominatimPlaces>> = [];

    if (coordinates) {
      const exactPlace = await reverseNominatimPlace(
        coordinates.lat,
        coordinates.lng
      );

      results.push(
        exactPlace ?? {
          id: `coords-${coordinates.lat}-${coordinates.lng}`,
          name: formatCoordinateLabel(coordinates.lat, coordinates.lng),
          lat: coordinates.lat,
          lng: coordinates.lng,
          subtitle: "Coordonnées GPS",
        }
      );
    }

    if (textQuery.length >= 2) {
      const nominatimResults = await searchNominatimPlaces(textQuery);
      results = mergeGeocodeResults(results, nominatimResults);
    }

    if (results.length > 0) {
      return Response.json({
        results,
        source: coordinates ? "coordinates+nominatim" : "nominatim",
      }, { headers: CACHE_HEADERS });
    }

    const photonQuery = textQuery.length >= 2 ? textQuery : query;
    const photonResults = await searchPhotonPlaces(photonQuery);
    return Response.json(
      { results: photonResults, source: "photon-fallback" },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error("[geocode] Search failed:", error);
    return Response.json(
      { error: "Impossible de rechercher cette ville." },
      { status: 500 }
    );
  }
}
