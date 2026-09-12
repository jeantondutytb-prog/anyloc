import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { generateDeviceToken, getTrialExpiry, hashDeviceToken, isTrialExpired } from "@/lib/device";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const platform = (body as Record<string, unknown> | null)?.platform;

  if (platform !== "android") {
    return Response.json(
      { error: "L'essai gratuit instantané est disponible uniquement sur Android." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json(
      { error: "Session invalide. Recharge la page et réessaie." },
      { status: 401 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return Response.json(
      { error: "Essai gratuit indisponible pour le moment." },
      { status: 503 }
    );
  }

  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("device_tokens")
    .select("id, trial_expires_at, is_trial")
    .eq("user_id", user.id)
    .eq("is_trial", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("[device/trial] Lookup failed:", existingError);
    return Response.json(
      { error: "Impossible de vérifier ton essai." },
      { status: 500 }
    );
  }

  if (existing && !isTrialExpired(existing)) {
    return Response.json(
      {
        error: "Ton essai gratuit est déjà en cours sur cet appareil.",
        trialExpiresAt: existing.trial_expires_at,
      },
      { status: 409 }
    );
  }

  if (existing) {
    return Response.json(
      { error: "Ton essai gratuit a déjà été utilisé. Active ton abonnement pour continuer." },
      { status: 403 }
    );
  }

  const token = generateDeviceToken();
  const trialExpiresAt = getTrialExpiry();

  const { data, error: insertError } = await admin
    .from("device_tokens")
    .insert({
      user_id: user.id,
      token_hash: hashDeviceToken(token),
      platform: "android",
      device_name: "Essai gratuit",
      is_trial: true,
      trial_expires_at: trialExpiresAt,
    })
    .select("id")
    .single();

  if (insertError || !data) {
    console.error("[device/trial] Insert failed:", insertError);
    return Response.json(
      { error: "Impossible de créer ton essai." },
      { status: 500 }
    );
  }

  return Response.json({
    token,
    trialExpiresAt,
    apiBaseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://www.anyloc.io",
  });
}
