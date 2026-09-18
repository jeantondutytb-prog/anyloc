import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { requireActiveSubscription } from "@/lib/subscription";

export async function GET() {
  const { user, error } = await requireActiveSubscription();

  if (!user) {
    const status = error?.includes("Connecte") ? 401 : 403;
    return Response.json({ error }, { status });
  }

  if (!isSupabaseAdminConfigured()) {
    return Response.json(
      { error: "Stockage pairing indisponible." },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("device_tokens")
    .select("id, platform, device_name, pairing_data, last_seen_at, created_at")
    .eq("user_id", user.id)
    .eq("platform", "ios")
    .not("pairing_data", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dbError) {
    console.error("[device/pairing/me] Load failed:", dbError);
    return Response.json(
      { error: "Impossible de charger le pairing." },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    hasPairing: Boolean(data?.pairing_data),
    pairing: data?.pairing_data ?? null,
    device: data
      ? {
          id: data.id,
          platform: data.platform,
          deviceName: data.device_name,
          lastSeenAt: data.last_seen_at,
          createdAt: data.created_at,
        }
      : null,
  });
}
