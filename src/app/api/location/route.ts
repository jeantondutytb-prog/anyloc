import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_LOCATION,
  mapLocationRow,
  parseLocationPayload,
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
        updatedAt: null,
      },
    });
  }

  const mapped = mapLocationRow(data);

  return Response.json({
    location: {
      name: mapped.name,
      lat: mapped.lat,
      lng: mapped.lng,
      accuracy: mapped.accuracy,
      isActive: mapped.isActive,
      updatedAt: mapped.updatedAt,
    },
  });
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

  const mapped = mapLocationRow(data);

  return Response.json({
    location: {
      name: mapped.name,
      lat: mapped.lat,
      lng: mapped.lng,
      accuracy: mapped.accuracy,
      isActive: mapped.isActive,
      updatedAt: mapped.updatedAt,
    },
  });
}
