export type ParsedCoordinates = {
  lat: number;
  lng: number;
};

const COORDINATE_COMMA_PATTERN =
  /(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)/g;

const COORDINATE_SPACE_PATTERN =
  /(?:^|\s)(-?\d{1,2}\.\d{3,})\s+(-?\d{1,3}\.\d{3,})(?:\s|$)/;

function isValidCoordinate(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function parseCoordinatesFromQuery(query: string): ParsedCoordinates | null {
  const commaMatches = [...query.matchAll(COORDINATE_COMMA_PATTERN)];

  for (const match of commaMatches) {
    const lat = Number(match[1]);
    const lng = Number(match[2]);

    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  const spaceMatch = query.match(COORDINATE_SPACE_PATTERN);

  if (spaceMatch) {
    const lat = Number(spaceMatch[1]);
    const lng = Number(spaceMatch[2]);

    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  return null;
}

export function stripCoordinatesFromQuery(query: string) {
  return query
    .replace(COORDINATE_COMMA_PATTERN, " ")
    .replace(COORDINATE_SPACE_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatCoordinateLabel(lat: number, lng: number) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
