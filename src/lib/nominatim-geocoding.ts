import type { GeocodeResult } from "@/lib/geocoding";

type NominatimAddress = {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
};

type NominatimResult = {
  place_id: number;
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  class?: string;
  type?: string;
  place_rank?: number;
  importance?: number;
  addresstype?: string;
  name?: string;
  display_name?: string;
  address?: NominatimAddress;
};

const WATER_TYPES = new Set(["sea", "bay", "ocean", "water", "lake", "reservoir", "river"]);

const PLACE_TYPE_PRIORITY: Record<string, number> = {
  house: 120,
  building: 110,
  amenity: 100,
  road: 90,
  pedestrian: 85,
  neighbourhood: 80,
  suburb: 75,
  quarter: 70,
  city_district: 65,
  town: 60,
  city: 55,
  village: 50,
  hamlet: 45,
  municipality: 40,
  county: 30,
  state: 20,
  country: 10,
};

function formatSubtitle(result: NominatimResult) {
  const address = result.address;

  if (!address) {
    const display = result.display_name?.trim();

    if (!display || display === result.name) {
      return "";
    }

    const name = result.name?.trim();

    if (name && display.startsWith(name)) {
      return display.slice(name.length).replace(/^[\s,]+/, "");
    }

    return display;
  }

  const parts: string[] = [];
  const city =
    address.city ?? address.town ?? address.village ?? address.municipality;
  const locality =
    address.suburb ?? address.neighbourhood ?? address.pedestrian ?? address.road;

  if (city && city !== result.name) {
    parts.push(city);
  } else if (locality && locality !== result.name) {
    parts.push(locality);
  }

  if (address.state && address.state !== result.name && !parts.includes(address.state)) {
    parts.push(address.state);
  }

  if (address.country) {
    parts.push(address.country);
  }

  return parts.join(", ");
}

function scoreNominatimResult(result: NominatimResult) {
  if (result.class === "natural" && result.type && WATER_TYPES.has(result.type)) {
    return -1000;
  }

  const typeScore =
    PLACE_TYPE_PRIORITY[result.addresstype ?? result.type ?? ""] ?? 25;
  const importanceBoost = (result.importance ?? 0) * 40;
  const rankBoost = Math.max(0, 30 - (result.place_rank ?? 30));

  return typeScore + importanceBoost + rankBoost;
}

function formatPlaceName(result: NominatimResult) {
  const explicitName = result.name?.trim();

  if (explicitName) {
    return explicitName;
  }

  const address = result.address;

  if (address) {
    const street = [address.house_number, address.road ?? address.pedestrian]
      .filter(Boolean)
      .join(" ");

    if (street) {
      return street;
    }

    const locality =
      address.neighbourhood ??
      address.suburb ??
      address.city ??
      address.town ??
      address.village;

    if (locality) {
      return locality;
    }
  }

  const display = result.display_name?.trim();

  if (display) {
    return display.split(",")[0]?.trim() ?? display;
  }

  return null;
}

function parseNominatimResult(result: NominatimResult): GeocodeResult | null {
  const name = formatPlaceName(result);
  const lat = Number(result.lat);
  const lng = Number(result.lon);

  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    id: `nominatim-${result.osm_type ?? "place"}-${result.osm_id ?? result.place_id}`,
    name,
    lat,
    lng,
    subtitle: formatSubtitle(result),
  };
}

export function parseNominatimResponse(data: NominatimResult[]): GeocodeResult[] {
  const seen = new Set<string>();

  return data
    .map((result) => ({
      result,
      score: scoreNominatimResult(result),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ result }) => parseNominatimResult(result))
    .filter((entry): entry is GeocodeResult => {
      if (!entry) {
        return false;
      }

      const key = `${entry.lat.toFixed(5)}:${entry.lng.toFixed(5)}:${entry.name}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function dedupeGeocodeResults(results: GeocodeResult[]) {
  const seen = new Set<string>();

  return results.filter((result) => {
    const key = `${result.lat.toFixed(5)}:${result.lng.toFixed(5)}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function reverseNominatimPlace(
  lat: number,
  lng: number
): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("accept-language", "fr");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Anyloc/1.0 (https://anyloc.io)",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as NominatimResult & { error?: string };

  if (data.error) {
    return null;
  }

  const parsed = parseNominatimResult(data);

  if (!parsed) {
    return {
      id: `coords-${lat}-${lng}`,
      name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      lat,
      lng,
      subtitle: "Coordonnées GPS",
    };
  }

  return {
    ...parsed,
    id: `coords-${lat}-${lng}`,
    subtitle: parsed.subtitle || "Coordonnées GPS",
  };
}

export async function searchNominatimPlaces(query: string): Promise<GeocodeResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "12");
  url.searchParams.set("accept-language", "fr");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Anyloc/1.0 (https://anyloc.io)",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error("Nominatim search unavailable");
  }

  const data = (await response.json()) as NominatimResult[];
  return parseNominatimResponse(data);
}

export function mergeGeocodeResults(
  primary: GeocodeResult[],
  secondary: GeocodeResult[]
) {
  return dedupeGeocodeResults([...primary, ...secondary]);
}
