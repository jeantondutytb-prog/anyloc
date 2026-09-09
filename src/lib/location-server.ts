import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  DEFAULT_LOCATION,
  mapLocationRow,
  parseLocationPayload,
  type LocationPayload,
  toLocationResponse,
} from "@/lib/location";

export async function upsertLocationForUser(
  userId: string,
  payload: LocationPayload
) {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Configuration serveur incomplète.");
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("location_settings")
    .select("route_started_at, is_active, mode")
    .eq("user_id", userId)
    .maybeSingle();

  const activating = payload.isActive === true;
  const switchingToRoute = payload.mode === "route";
  const shouldStartRoute =
    switchingToRoute &&
    activating &&
    (payload.resetRoute ||
      !existing?.route_started_at ||
      existing.mode !== "route" ||
      !existing.is_active);

  const routeStartedAt =
    switchingToRoute && activating
      ? shouldStartRoute
        ? new Date().toISOString()
        : (existing?.route_started_at ?? new Date().toISOString())
      : (existing?.route_started_at ?? null);

  const { data, error } = await admin
    .from("location_settings")
    .upsert(
      {
        user_id: userId,
        name: payload.name,
        lat: payload.lat,
        lng: payload.lng,
        accuracy: payload.accuracy ?? DEFAULT_LOCATION.accuracy,
        is_active: payload.isActive ?? false,
        mode: payload.mode ?? "static",
        route_waypoints: payload.waypoints ?? null,
        route_speed_kmh: payload.speedKmh ?? 40,
        route_started_at: routeStartedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("[location] Save failed:", error);
    throw new Error("Impossible d'enregistrer ta position.");
  }

  return toLocationResponse(mapLocationRow(data));
}

export function parseLocationRequestBody(body: unknown) {
  return parseLocationPayload(body);
}
