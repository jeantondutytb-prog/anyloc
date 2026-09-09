import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { refineLocationPayload } from "@/lib/coordinate-refinement";
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

  const refinedPayload = await refineLocationPayload(payload);
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("location_settings")
    .select("route_started_at, is_active, mode")
    .eq("user_id", userId)
    .maybeSingle();

  const activating = refinedPayload.isActive === true;
  const switchingToRoute = refinedPayload.mode === "route";
  const shouldStartRoute =
    switchingToRoute &&
    activating &&
    (refinedPayload.resetRoute ||
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
        name: refinedPayload.name,
        lat: refinedPayload.lat,
        lng: refinedPayload.lng,
        accuracy: refinedPayload.accuracy ?? DEFAULT_LOCATION.accuracy,
        is_active: refinedPayload.isActive ?? false,
        mode: refinedPayload.mode ?? "static",
        route_waypoints: refinedPayload.waypoints ?? null,
        route_speed_kmh: refinedPayload.speedKmh ?? 40,
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
