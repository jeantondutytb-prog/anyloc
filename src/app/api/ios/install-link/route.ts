import {
  buildIosOtaInstallUrl,
  createIosInstallToken,
  getIosManifestUrl,
} from "@/lib/ios-ota-install";
import { isDownloadAvailable } from "@/lib/downloads";
import { requireActiveSubscription } from "@/lib/subscription";

export async function POST() {
  const { user, error, access } = await requireActiveSubscription();

  if (!user || !access?.hasAccess) {
    const status = error?.includes("Connecte") ? 401 : 403;
    return Response.json({ error: error ?? "Abonnement actif requis." }, { status });
  }

  const available = await isDownloadAvailable("ipa");

  if (!available) {
    return Response.json(
      {
        error:
          "L'app iPhone n'est pas encore disponible. Réessaie dans quelques minutes.",
      },
      { status: 503 }
    );
  }

  const token = createIosInstallToken(user.id);

  if (!token) {
    return Response.json(
      { error: "Configuration serveur incomplète pour l'installation iPhone." },
      { status: 503 }
    );
  }

  const manifestUrl = getIosManifestUrl(token);
  const installUrl = buildIosOtaInstallUrl(manifestUrl);

  return Response.json({
    installUrl,
    manifestUrl,
  });
}
