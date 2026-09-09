import {
  getDownloadAsset,
  isValidDownloadPlatform,
  resolveDownloadUrl,
} from "@/lib/downloads";
import { requireActiveSubscription } from "@/lib/subscription";

type RouteContext = {
  params: Promise<{ platform: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { platform } = await context.params;

  if (!isValidDownloadPlatform(platform)) {
    return Response.json({ error: "Plateforme inconnue." }, { status: 404 });
  }

  const { error, access } = await requireActiveSubscription();

  if (error || !access?.hasAccess) {
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

  const { error, access } = await requireActiveSubscription();

  if (error || !access?.hasAccess) {
    return new Response(null, { status: 403 });
  }

  const downloadUrl = await resolveDownloadUrl(platform);

  if (!downloadUrl) {
    return new Response(null, { status: 503 });
  }

  return new Response(null, { status: 200 });
}
