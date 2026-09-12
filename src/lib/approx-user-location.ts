export type ApproxUserLocation = {
  city: string;
  area: string;
};

const FALLBACK_LOCATION: ApproxUserLocation = {
  city: "Chez toi",
  area: "Position réelle",
};

function decodeHeaderValue(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getApproxLocationFromHeaders(
  headerGet: (name: string) => string | null
): ApproxUserLocation | null {
  const city = decodeHeaderValue(headerGet("x-vercel-ip-city"))?.trim();
  const region = decodeHeaderValue(headerGet("x-vercel-ip-country-region"))?.trim();
  const country = decodeHeaderValue(headerGet("x-vercel-ip-country"))?.trim();

  if (!city) {
    return null;
  }

  const area =
    region && region !== city
      ? region
      : country && country !== "FR"
        ? country
        : "Position réelle";

  return { city, area };
}

export function getFallbackApproxLocation(): ApproxUserLocation {
  return FALLBACK_LOCATION;
}
