export type LocationSettings = {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  accuracy: number;
  isActive: boolean;
  updatedAt: string;
};

export type LocationPayload = {
  name: string;
  lat: number;
  lng: number;
  accuracy?: number;
  isActive?: boolean;
};

export const DEFAULT_LOCATION = {
  name: "Marbella — Puerto Banús",
  lat: 36.4848,
  lng: -4.9526,
  accuracy: 10,
};

export function isValidCoordinate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseLocationPayload(body: unknown): LocationPayload | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const lat = record.lat;
  const lng = record.lng;

  if (
    !name ||
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  const accuracy =
    typeof record.accuracy === "number" && record.accuracy > 0
      ? record.accuracy
      : DEFAULT_LOCATION.accuracy;

  const isActive =
    typeof record.isActive === "boolean" ? record.isActive : undefined;

  return {
    name,
    lat,
    lng,
    accuracy,
    isActive,
  };
}

export function mapLocationRow(row: {
  user_id: string;
  name: string;
  lat: number;
  lng: number;
  accuracy: number;
  is_active: boolean;
  updated_at: string;
}): LocationSettings {
  return {
    userId: row.user_id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    accuracy: row.accuracy,
    isActive: row.is_active,
    updatedAt: row.updated_at,
  };
}
