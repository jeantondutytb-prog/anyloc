import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_LOCATION,
  mapLocationRow,
  toLocationResponse,
} from "@/lib/location";
import {
  parseLocationRequestBody,
  upsertLocationForUser,
} from "@/lib/location-server";
import { rejectCrossSiteMutation } from "@/lib/csrf";
import { requireActiveSubscription } from "@/lib/subscription";

export async function GET() {
  const { user, error, access } = await requireActiveSubscription();

  if (!user) {
    return Response.json({ error }, { status: 401 });
  }

  if (!access?.hasAccess) {
    return Response.json({ error }, { status: 403 });
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
  const crossSiteResponse = rejectCrossSiteMutation(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const { user, error, access } = await requireActiveSubscription();

  if (!user) {
    return Response.json({ error }, { status: 401 });
  }

  if (!access?.hasAccess) {
    return Response.json({ error }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const payload = parseLocationRequestBody(body);

  if (!payload) {
    return Response.json(
      { error: "Position invalide. Vérifie le nom et les coordonnées." },
      { status: 400 }
    );
  }

  try {
    const result = await upsertLocationForUser(user.id, payload);
    return Response.json(result);
  } catch (saveError) {
    console.error("[location] Save failed:", saveError);
    return Response.json(
      { error: "Impossible d'enregistrer ta position." },
      { status: 500 }
    );
  }
}
