import {
  getDownloadAsset,
  isValidDownloadPlatform,
  resolveDownloadUrl,
} from "@/lib/downloads";
import {
  getAuthenticatedUser,
  hasActiveAndroidTrial,
  requireActiveSubscription,
} from "@/lib/subscription";

type RouteContext = {
  params: Promise<{ platform: string }>;
};

async function hasDownloadAccess(platform: string) {
  if (platform === "apk") {
    const user = await getAuthenticatedUser();
    if (user && (await hasActiveAndroidTrial(user.id))) {
      return { allowed: true, error: null };
    }
  }

  const { error, access } = await requireActiveSubscription();
  return { allowed: Boolean(access?.hasAccess), error };
}

export async function GET(_request: Request, context: RouteContext) {
  const { platform } = await context.params;

  if (!isValidDownloadPlatform(platform)) {
    return Response.json({ error: "Plateforme inconnue." }, { status: 404 });
  }

  const { allowed, error } = await hasDownloadAccess(platform);

  if (!allowed) {
    return Response.json(
      { error: error ?? "Abonnement actif requis." },
      { status: 403 }
    );
  }

  const asset = getDownloadAsset(platform);
  const downloadUrl = await resolveDownloadUrl(platform);

  if (!asset || !downloadUrl) {
    return Response.json(
      {
        error:
          "Le fichier n'est pas encore disponible. Reviens bientôt — on finalise les builds.",
      },
      { status: 503 }
    );
  }

  return Response.redirect(downloadUrl, 302);
}

export async function HEAD(_request: Request, context: RouteContext) {
  const { platform } = await context.params;

  if (!isValidDownloadPlatform(platform)) {
    return new Response(null, { status: 404 });
  }

  const { allowed } = await hasDownloadAccess(platform);

  if (!allowed) {
    return new Response(null, { status: 403 });
  }

  const downloadUrl = await resolveDownloadUrl(platform);

  if (!downloadUrl) {
    return new Response(null, { status: 503 });
  }

  return new Response(null, { status: 200 });
}
