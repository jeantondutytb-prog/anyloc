"use server";

import { parseClipperApplication } from "@/lib/clipper-application";
import { capturePostHogEvent } from "@/lib/posthog/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type ClipperApplicationState = {
  error?: string;
  submitted?: boolean;
};

export async function submitClipperApplication(
  _previousState: ClipperApplicationState,
  formData: FormData
): Promise<ClipperApplicationState> {
  // Champ piège invisible : seuls les robots le remplissent.
  if (formData.get("website")) {
    return { submitted: true };
  }

  const result = parseClipperApplication(formData);
  if (!result.ok) {
    return { error: result.error };
  }

  if (!isSupabaseAdminConfigured()) {
    return { error: "Les candidatures sont momentanément indisponibles." };
  }

  // Si la personne est connectée, on rattache la candidature à son compte.
  let user: { id: string; email?: string } | null = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  const { application } = result;
  const { error } = await createAdminClient()
    .from("clipper_applications")
    .upsert(
      {
        user_id: user?.id ?? null,
        email: user?.email ?? null,
        first_name: application.firstName,
        instagram: application.instagram,
        videos_per_day: application.videosPerDay,
        // Un numéro laissé vide n'efface pas celui d'une candidature précédente.
        ...(application.phone ? { phone: application.phone } : {}),
        // Sans campagne dans le lien, on garde la source d'une candidature précédente.
        ...(application.utmCampaign ? { utm_campaign: application.utmCampaign } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "instagram" }
    );

  if (error) {
    console.error("clipper application insert failed", error);
    return { error: "Impossible d'enregistrer ta candidature. Réessaie dans un instant." };
  }

  await capturePostHogEvent({
    distinctId: user?.id ?? crypto.randomUUID(),
    event: "clipper_application_submitted",
    properties: {
      videos_per_day: application.videosPerDay,
      phone_provided: Boolean(application.phone),
      utm_campaign: application.utmCampaign,
    },
  });

  return { submitted: true };
}
