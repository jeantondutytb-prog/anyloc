import { createClient } from "@/lib/supabase/server";
import {
  generateDeviceToken,
  hashDeviceToken,
  parseDeviceRegisterBody,
} from "@/lib/device";
import { requireActiveSubscription } from "@/lib/subscription";

export async function GET() {
  const { user, error } = await requireActiveSubscription();

  if (!user) {
    return Response.json({ error }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("device_tokens")
    .select("id, platform, device_name, last_seen_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (dbError) {
    console.error("[device] List failed:", dbError);
    return Response.json(
      { error: "Impossible de charger tes appareils." },
      { status: 500 }
    );
  }

  return Response.json({
    devices: (data ?? []).map((row) => ({
      id: row.id,
      platform: row.platform,
      deviceName: row.device_name,
      lastSeenAt: row.last_seen_at,
      createdAt: row.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const { user, error } = await requireActiveSubscription();

  if (!user) {
    const status = error?.includes("Connecte") ? 401 : 403;
    return Response.json({ error }, { status });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const payload = parseDeviceRegisterBody(body);

  if (!payload) {
    return Response.json(
      { error: "Plateforme invalide. Utilise android ou ios." },
      { status: 400 }
    );
  }

  const token = generateDeviceToken();
  const supabase = await createClient();

  const { data, error: dbError } = await supabase
    .from("device_tokens")
    .insert({
      user_id: user.id,
      token_hash: hashDeviceToken(token),
      platform: payload.platform,
      device_name: payload.deviceName,
    })
    .select("id, platform, device_name, created_at")
    .single();

  if (dbError || !data) {
    console.error("[device] Register failed:", dbError);
    return Response.json(
      { error: "Impossible de créer le token appareil." },
      { status: 500 }
    );
  }

  return Response.json({
    device: {
      id: data.id,
      platform: data.platform,
      deviceName: data.device_name,
      createdAt: data.created_at,
    },
    token,
    apiBaseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://anyloc.io",
  });
}
