import {
  getDownloadAsset,
  isValidDownloadPlatform,
  resolveDownloadUrl,
} from "@/lib/downloads";
import { capturePostHogEvent } from "@/lib/posthog/server";
import { requireActiveSubscription } from "@/lib/subscription";

type RouteContext = {
  params: Promise<{ platform: string }>;
};

async function hasDownloadAccess() {
  const { user, error, access } = await requireActiveSubscription();
  return { userId: user?.id ?? null, allowed: Boolean(access?.hasAccess), error };
}

export async function GET(_request: Request, context: RouteContext) {
  const { platform } = await context.params;

  if (!isValidDownloadPlatform(platform)) {
    return Response.json({ error: "Plateforme inconnue." }, { status: 404 });
  }

  const { userId, allowed, error } = await hasDownloadAccess();

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

  if (userId) {
    await capturePostHogEvent({
      distinctId: userId,
      event: "app_downloaded",
      properties: { platform },
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: downloadUrl,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

export async function HEAD(_request: Request, context: RouteContext) {
  const { platform } = await context.params;

  if (!isValidDownloadPlatform(platform)) {
    return new Response(null, { status: 404 });
  }

  const { allowed } = await hasDownloadAccess();

  if (!allowed) {
    return new Response(null, { status: 403 });
  }

  const downloadUrl = await resolveDownloadUrl(platform);

  if (!downloadUrl) {
    return new Response(null, { status: 503 });
  }

  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
