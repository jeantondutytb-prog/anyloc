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

export async function GET(request: Request) {
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
      });
    }

    const photonQuery = textQuery.length >= 2 ? textQuery : query;
    const photonResults = await searchPhotonPlaces(photonQuery);
    return Response.json({ results: photonResults, source: "photon-fallback" });
  } catch (error) {
    console.error("[geocode] Search failed:", error);
    return Response.json(
      { error: "Impossible de rechercher cette ville." },
      { status: 500 }
    );
  }
}
