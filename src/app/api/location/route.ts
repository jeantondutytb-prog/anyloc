import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_LOCATION,
  mapLocationRow,
  parseLocationPayload,
  toLocationResponse,
} from "@/lib/location";
import { requireAuthenticatedUser } from "@/lib/subscription";

export async function GET() {
  const { user, error } = await requireAuthenticatedUser();

  if (!user) {
    return Response.json({ error }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("location_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (dbError) {
    console.error("[location] Read failed:", dbError);
    return Response.json(
      { error: "Impossible de charger ta position." },
      { status: 500 }
    );
  }

  if (!data) {
    return Response.json({
      location: {
        name: DEFAULT_LOCATION.name,
        lat: DEFAULT_LOCATION.lat,
        lng: DEFAULT_LOCATION.lng,
        accuracy: DEFAULT_LOCATION.accuracy,
        isActive: false,
        mode: "static",
        waypoints: [],
        speedKmh: 40,
        routeStartedAt: null,
        routeProgress: null,
        updatedAt: null,
      },
    });
  }

  return Response.json(toLocationResponse(mapLocationRow(data)));
}

export async function PUT(request: Request) {
  const { user, error } = await requireAuthenticatedUser();

  if (!user) {
    return Response.json({ error }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const payload = parseLocationPayload(body);

  if (!payload) {
    return Response.json(
      { error: "Position invalide. Vérifie le nom et les coordonnées." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("location_settings")
    .select("route_started_at, is_active, mode")
    .eq("user_id", user.id)
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
        : existing?.route_started_at ?? new Date().toISOString()
      : existing?.route_started_at ?? null;

  const { data, error: dbError } = await supabase
    .from("location_settings")
    .upsert(
      {
        user_id: user.id,
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

  if (dbError || !data) {
    console.error("[location] Save failed:", dbError);
    return Response.json(
      { error: "Impossible d'enregistrer ta position." },
      { status: 500 }
    );
  }

  return Response.json(toLocationResponse(mapLocationRow(data)));
}
