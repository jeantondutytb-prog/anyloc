import { IOS_ADHOC_BUNDLE_ID } from "@/lib/ios-adhoc/config";
import { buildInstallManifest, verifyInstallToken } from "@/lib/ios-adhoc/install-link";
import { signedIpaUrl } from "@/lib/ios-adhoc/ipa-storage";
import { getBuild } from "@/lib/ios-adhoc/store";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const secret = process.env.IOS_INSTALL_LINK_SECRET;
  const payload = secret ? verifyInstallToken(token, secret, Date.now()) : null;

  if (!payload) {
    return new Response("Lien expiré.", { status: 403 });
  }

  const build = await getBuild(payload.buildId);

  if (!build || build.status !== "succeeded" || !build.ipa_blob_path || !build.bundle_version) {
    return new Response("Build introuvable.", { status: 404 });
  }

  const ipaUrl = await signedIpaUrl(build.ipa_blob_path);
  const manifest = buildInstallManifest({
    ipaUrl,
    bundleId: IOS_ADHOC_BUNDLE_ID,
    bundleVersion: build.bundle_version,
    title: "Anyloc",
  });

  return new Response(manifest, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" },
  });
}
