import type { GeocodeResult } from "@/lib/geocoding";

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
};

type GooglePlacesSearchResponse = {
  places?: GooglePlace[];
};

const WATER_PLACE_TYPES = new Set([
  "sea",
  "ocean",
  "bay",
  "lake",
  "river",
  "canal",
  "waterfall",
  "natural_feature",
]);

function formatSubtitle(place: GooglePlace) {
  const name = place.displayName?.text?.trim();
  const address = place.formattedAddress?.trim();

  if (!address) {
    return "";
  }

  if (name && address.toLowerCase().startsWith(name.toLowerCase())) {
    return address.slice(name.length).replace(/^[\s,]+/, "");
  }

  if (address === name) {
    return "";
  }

  return address;
}

function isWaterPlace(place: GooglePlace) {
  if (!place.types?.length) {
    return false;
  }

  return place.types.some((type) => WATER_PLACE_TYPES.has(type));
}

function parseGooglePlace(place: GooglePlace): GeocodeResult | null {
  const name = place.displayName?.text?.trim();
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;

  if (
    !name ||
    lat === undefined ||
    lng === undefined ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  return {
    id: place.id ?? `google-${lat}-${lng}`,
    name,
    lat,
    lng,
    subtitle: formatSubtitle(place),
  };
}

export function parseGooglePlacesResponse(
  data: GooglePlacesSearchResponse
): GeocodeResult[] {
  if (!data.places?.length) {
    return [];
  }

  const seen = new Set<string>();

  return data.places
    .filter((place) => !isWaterPlace(place))
    .map(parseGooglePlace)
    .filter((result): result is GeocodeResult => {
      if (!result) {
        return false;
      }

      const key = `${result.lat.toFixed(5)}:${result.lng.toFixed(5)}:${result.name}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

export async function searchGooglePlaces(query: string): Promise<GeocodeResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return [];
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.types",
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "fr",
      maxResultCount: 12,
    }),
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[google-places] Search failed:", response.status, errorBody);
    return [];
  }

  const data = (await response.json()) as GooglePlacesSearchResponse;
  return parseGooglePlacesResponse(data);
}
