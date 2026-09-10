type PhotonFeatureProperties = {
  osm_key?: string;
  osm_value?: string;
  type?: string;
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
};

type PhotonFeature = {
  geometry: {
    coordinates: [number, number];
  };
  properties: PhotonFeatureProperties;
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

const WATER_OSM_KEYS = new Set(["natural", "waterway", "water"]);
const WATER_OSM_VALUES = new Set([
  "sea",
  "bay",
  "ocean",
  "water",
  "lake",
  "reservoir",
  "river",
  "stream",
  "canal",
  "coastline",
  "strait",
  "lagoon",
  "wetland",
  "dock",
  "basin",
]);

const LAND_TYPE_PRIORITY: Record<string, number> = {
  house: 100,
  street: 80,
  locality: 60,
  district: 50,
  county: 30,
  city: 10,
  state: 5,
  country: 1,
};

export function isWaterFeature(properties: PhotonFeatureProperties) {
  if (properties.osm_value && WATER_OSM_VALUES.has(properties.osm_value)) {
    return true;
  }

  if (
    properties.osm_key &&
    WATER_OSM_KEYS.has(properties.osm_key) &&
    (!properties.osm_value || WATER_OSM_VALUES.has(properties.osm_value))
  ) {
    return true;
  }

  return false;
}

export function scorePhotonFeature(properties: PhotonFeatureProperties) {
  if (isWaterFeature(properties)) {
    return -1000;
  }

  const typeScore = LAND_TYPE_PRIORITY[properties.type ?? ""] ?? 20;
  const streetBoost = properties.street ? 15 : 0;

  return typeScore + streetBoost;
}

export function pickBestPhotonFeature(features: PhotonFeature[]) {
  let best: PhotonFeature | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const feature of features) {
    const score = scorePhotonFeature(feature.properties);

    if (score > bestScore) {
      best = feature;
      bestScore = score;
    }
  }

  return bestScore > 0 ? best : null;
}

export function formatRefinedName(properties: PhotonFeatureProperties) {
  const name = properties.name?.trim();

  if (name && properties.street && properties.street !== name) {
    return `${name} — ${properties.street}`;
  }

  if (name) {
    return name;
  }

  if (properties.street) {
    const parts = [properties.street];

    if (properties.city) {
      parts.push(properties.city);
    }

    return parts.join(", ");
  }

  if (properties.city) {
    return properties.city;
  }

  return null;
}

export function looksLikeRawCoordinates(name: string) {
  return /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(name.trim());
}

export type RefinedCoordinates = {
  lat: number;
  lng: number;
  name?: string;
  refined: boolean;
};

async function reverseGeocodePhoton(lat: number, lng: number) {
  const url = new URL("https://photon.komoot.io/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("limit", "8");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as PhotonResponse;
  const best = pickBestPhotonFeature(data.features ?? []);

  if (!best) {
    return null;
  }

  const [refinedLng, refinedLat] = best.geometry.coordinates;

  return {
    lat: refinedLat,
    lng: refinedLng,
    name: formatRefinedName(best.properties) ?? undefined,
  };
}

async function reverseGeocodeNominatim(lat: number, lng: number) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

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

  const data = (await response.json()) as {
    lat?: string;
    lon?: string;
    display_name?: string;
    address?: {
      road?: string;
      pedestrian?: string;
      neighbourhood?: string;
      suburb?: string;
      city?: string;
      town?: string;
      village?: string;
    };
    class?: string;
    type?: string;
  };

  if (data.class === "natural" && (data.type === "water" || data.type === "bay")) {
    return null;
  }

  const refinedLat = Number(data.lat);
  const refinedLng = Number(data.lon);

  if (!Number.isFinite(refinedLat) || !Number.isFinite(refinedLng)) {
    return null;
  }

  const address = data.address;
  const street =
    address?.road ?? address?.pedestrian ?? address?.neighbourhood ?? address?.suburb;
  const city = address?.city ?? address?.town ?? address?.village;
  const name = street && city ? `${street}, ${city}` : data.display_name;

  return {
    lat: refinedLat,
    lng: refinedLng,
    name,
  };
}

export async function refineCoordinates(
  lat: number,
  lng: number,
  options: { name?: string } = {}
): Promise<RefinedCoordinates> {
  const photonResult = await reverseGeocodePhoton(lat, lng);

  if (photonResult) {
    const shouldReplaceName =
      !options.name || looksLikeRawCoordinates(options.name);

    return {
      lat: photonResult.lat,
      lng: photonResult.lng,
      name: shouldReplaceName ? photonResult.name : options.name,
      refined: true,
    };
  }

  const nominatimResult = await reverseGeocodeNominatim(lat, lng);

  if (nominatimResult) {
    const shouldReplaceName =
      !options.name || looksLikeRawCoordinates(options.name);

    return {
      lat: nominatimResult.lat,
      lng: nominatimResult.lng,
      name: shouldReplaceName ? nominatimResult.name : options.name,
      refined: true,
    };
  }

  return {
    lat,
    lng,
    name: options.name,
    refined: false,
  };
}

export async function refineLocationPayload<
  T extends { name: string; lat: number; lng: number; mode?: string },
>(payload: T): Promise<T> {
  if (payload.mode === "route") {
    return payload;
  }

  const shouldReplaceName =
    !payload.name || looksLikeRawCoordinates(payload.name);

  if (!shouldReplaceName) {
    return payload;
  }

  const refined = await refineCoordinates(payload.lat, payload.lng, {
    name: payload.name,
  });

  if (!refined.refined || !refined.name) {
    return payload;
  }

  return {
    ...payload,
    name: refined.name,
  };
}
