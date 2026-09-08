export type GeocodeResult = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle: string;
};

type PhotonFeature = {
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    type?: string;
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

function formatSubtitle(properties: PhotonFeature["properties"]) {
  const parts: string[] = [];

  if (properties.city && properties.city !== properties.name) {
    parts.push(properties.city);
  }

  if (properties.state && properties.state !== properties.name) {
    parts.push(properties.state);
  }

  if (properties.country) {
    parts.push(properties.country);
  }

  return parts.join(", ");
}

export function parsePhotonResponse(data: PhotonResponse): GeocodeResult[] {
  if (!data.features?.length) {
    return [];
  }

  const seen = new Set<string>();

  return data.features
    .map((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const name = feature.properties.name?.trim();

      if (!name) {
        return null;
      }

      const id = `${feature.properties.osm_type ?? "place"}-${feature.properties.osm_id ?? `${lat}-${lng}`}`;

      if (seen.has(id)) {
        return null;
      }

      seen.add(id);

      return {
        id,
        name,
        lat,
        lng,
        subtitle: formatSubtitle(feature.properties),
      };
    })
    .filter((result): result is GeocodeResult => result !== null);
}
