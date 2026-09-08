import {
  interpolateAlongRoute,
  parseWaypoints,
  type Waypoint,
} from "@/lib/route-simulation";

export type LocationMode = "static" | "route";

export type LocationSettings = {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  accuracy: number;
  isActive: boolean;
  mode: LocationMode;
  waypoints: Waypoint[];
  speedKmh: number;
  routeStartedAt: string | null;
  updatedAt: string;
};

export type ResolvedLocation = {
  name: string;
  lat: number;
  lng: number;
  accuracy: number;
  isActive: boolean;
  mode: LocationMode;
  waypoints: Waypoint[];
  speedKmh: number;
  routeStartedAt: string | null;
  routeProgress: number | null;
  updatedAt: string | null;
};

export type LocationPayload = {
  name: string;
  lat: number;
  lng: number;
  accuracy?: number;
  isActive?: boolean;
  mode?: LocationMode;
  waypoints?: Waypoint[];
  speedKmh?: number;
  resetRoute?: boolean;
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
  const mode = record.mode === "route" ? "route" : "static";
  const name = typeof record.name === "string" ? record.name.trim() : "";

  if (!name) {
    return null;
  }

  const accuracy =
    typeof record.accuracy === "number" && record.accuracy > 0
      ? record.accuracy
      : DEFAULT_LOCATION.accuracy;

  const isActive =
    typeof record.isActive === "boolean" ? record.isActive : undefined;

  const speedKmh =
    typeof record.speedKmh === "number" && record.speedKmh > 0
      ? record.speedKmh
      : 40;

  const resetRoute = record.resetRoute === true;

  if (mode === "route") {
    const waypoints = parseWaypoints(record.waypoints);

    if (!waypoints) {
      return null;
    }

    return {
      name,
      lat: waypoints[0].lat,
      lng: waypoints[0].lng,
      accuracy,
      isActive,
      mode,
      waypoints,
      speedKmh,
      resetRoute,
    };
  }

  const lat = record.lat;
  const lng = record.lng;

  if (
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

  return {
    name,
    lat,
    lng,
    accuracy,
    isActive,
    mode,
    resetRoute,
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
  mode?: string | null;
  route_waypoints?: unknown;
  route_speed_kmh?: number | null;
  route_started_at?: string | null;
}): LocationSettings {
  return {
    userId: row.user_id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    accuracy: row.accuracy,
    isActive: row.is_active,
    mode: row.mode === "route" ? "route" : "static",
    waypoints: parseWaypoints(row.route_waypoints) ?? [],
    speedKmh: row.route_speed_kmh ?? 40,
    routeStartedAt: row.route_started_at ?? null,
    updatedAt: row.updated_at,
  };
}

export function resolveLocation(
  settings: LocationSettings,
  now = new Date()
): ResolvedLocation {
  const base: ResolvedLocation = {
    name: settings.name,
    lat: settings.lat,
    lng: settings.lng,
    accuracy: settings.accuracy,
    isActive: settings.isActive,
    mode: settings.mode,
    waypoints: settings.waypoints,
    speedKmh: settings.speedKmh,
    routeStartedAt: settings.routeStartedAt,
    routeProgress: null,
    updatedAt: settings.updatedAt,
  };

  if (
    settings.mode !== "route" ||
    !settings.isActive ||
    !settings.routeStartedAt ||
    settings.waypoints.length < 2
  ) {
    return base;
  }

  const simulated = interpolateAlongRoute({
    waypoints: settings.waypoints,
    speedKmh: settings.speedKmh,
    startedAt: settings.routeStartedAt,
    now,
  });

  if (!simulated) {
    return base;
  }

  return {
    ...base,
    lat: simulated.lat,
    lng: simulated.lng,
    routeProgress: simulated.progress,
  };
}

export function toLocationResponse(settings: LocationSettings) {
  const resolved = resolveLocation(settings);

  return {
    location: {
      name: resolved.name,
      lat: resolved.lat,
      lng: resolved.lng,
      accuracy: resolved.accuracy,
      isActive: resolved.isActive,
      mode: resolved.mode,
      waypoints: resolved.waypoints,
      speedKmh: resolved.speedKmh,
      routeStartedAt: resolved.routeStartedAt,
      routeProgress: resolved.routeProgress,
      updatedAt: resolved.updatedAt,
    },
  };
}
