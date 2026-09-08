export type Waypoint = {
  lat: number;
  lng: number;
  name?: string;
};

export type RouteSimulationInput = {
  waypoints: Waypoint[];
  speedKmh: number;
  startedAt: string;
  now?: Date;
};

export type RouteSimulationResult = {
  lat: number;
  lng: number;
  progress: number;
  distanceMeters: number;
  completed: boolean;
};

const EARTH_RADIUS_METERS = 6_371_000;

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function getRouteDistanceMeters(waypoints: Waypoint[]) {
  if (waypoints.length < 2) {
    return 0;
  }

  let total = 0;

  for (let index = 1; index < waypoints.length; index += 1) {
    total += haversineMeters(waypoints[index - 1], waypoints[index]);
  }

  return total;
}

export function interpolateAlongRoute({
  waypoints,
  speedKmh,
  startedAt,
  now = new Date(),
}: RouteSimulationInput): RouteSimulationResult | null {
  if (waypoints.length < 2 || speedKmh <= 0) {
    return null;
  }

  const startedMs = Date.parse(startedAt);

  if (Number.isNaN(startedMs)) {
    return null;
  }

  const elapsedSeconds = Math.max(0, (now.getTime() - startedMs) / 1000);
  const targetDistance = (speedKmh * 1000 / 3600) * elapsedSeconds;
  const totalDistance = getRouteDistanceMeters(waypoints);

  if (totalDistance === 0) {
    return {
      lat: waypoints[0].lat,
      lng: waypoints[0].lng,
      progress: 1,
      distanceMeters: 0,
      completed: true,
    };
  }

  if (targetDistance >= totalDistance) {
    const last = waypoints[waypoints.length - 1];
    return {
      lat: last.lat,
      lng: last.lng,
      progress: 1,
      distanceMeters: totalDistance,
      completed: true,
    };
  }

  let walked = 0;

  for (let index = 1; index < waypoints.length; index += 1) {
    const start = waypoints[index - 1];
    const end = waypoints[index];
    const segmentDistance = haversineMeters(start, end);

    if (walked + segmentDistance >= targetDistance) {
      const remaining = targetDistance - walked;
      const ratio = segmentDistance === 0 ? 0 : remaining / segmentDistance;

      return {
        lat: start.lat + (end.lat - start.lat) * ratio,
        lng: start.lng + (end.lng - start.lng) * ratio,
        progress: targetDistance / totalDistance,
        distanceMeters: targetDistance,
        completed: false,
      };
    }

    walked += segmentDistance;
  }

  const last = waypoints[waypoints.length - 1];

  return {
    lat: last.lat,
    lng: last.lng,
    progress: 1,
    distanceMeters: totalDistance,
    completed: true,
  };
}

export function parseWaypoints(value: unknown): Waypoint[] | null {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  const waypoints: Waypoint[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const record = item as Record<string, unknown>;
    const lat = record.lat;
    const lng = record.lng;

    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return null;
    }

    waypoints.push({
      lat,
      lng,
      name: typeof record.name === "string" ? record.name : undefined,
    });
  }

  return waypoints;
}
