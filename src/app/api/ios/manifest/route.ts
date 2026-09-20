import {
  buildIosManifestPlist,
  verifyIosInstallToken,
} from "@/lib/ios-ota-install";
import { resolveDownloadUrl } from "@/lib/downloads";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const payload = verifyIosInstallToken(token);

  if (!payload) {
    return new Response("Lien d'installation expiré ou invalide.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const ipaUrl = await resolveDownloadUrl("ipa");

  if (!ipaUrl) {
    return new Response(
      "L'app iPhone n'est pas encore disponible. Réessaie dans quelques minutes.",
      {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }

  return new Response(buildIosManifestPlist(ipaUrl), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
