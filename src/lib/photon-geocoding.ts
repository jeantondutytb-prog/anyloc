import type { GeocodeResult } from "@/lib/geocoding";
import { parsePhotonResponse } from "@/lib/geocoding";

export async function searchPhotonPlaces(query: string): Promise<GeocodeResult[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "12");
  url.searchParams.set("lang", "fr");
  url.searchParams.set("layer", "house");
  url.searchParams.append("layer", "street");
  url.searchParams.append("layer", "locality");
  url.searchParams.append("layer", "district");
  url.searchParams.append("layer", "city");
  url.searchParams.append("layer", "county");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error("Photon search unavailable");
  }

  const data = await response.json();
  const results = parsePhotonResponse(data);

  if (results.length > 0) {
    return results;
  }

  const fallbackUrl = new URL("https://photon.komoot.io/api/");
  fallbackUrl.searchParams.set("q", query);
  fallbackUrl.searchParams.set("limit", "8");
  fallbackUrl.searchParams.set("lang", "fr");

  const fallbackResponse = await fetch(fallbackUrl, {
    headers: {
      Accept: "application/json",
    },
    next: { revalidate: 300 },
  });

  if (!fallbackResponse.ok) {
    throw new Error("Photon fallback search unavailable");
  }

  const fallbackData = await fallbackResponse.json();
  return parsePhotonResponse(fallbackData);
}
