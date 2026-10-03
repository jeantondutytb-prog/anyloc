import { timingSafeEqual } from "node:crypto";
import { ensureBuildForPendingDevices } from "@/lib/ios-adhoc/service";
import { MAX_IPA_BYTES, storeIpa } from "@/lib/ios-adhoc/ipa-storage";
import { completeBuild, getBuild } from "@/lib/ios-adhoc/store";

function authorized(request: Request) {
  const secret = process.env.IOS_BUILD_CALLBACK_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const buildId = typeof body?.buildId === "string" ? body.buildId : null;

  if (!buildId) {
    return Response.json({ error: "buildId manquant." }, { status: 400 });
  }

  if (body?.status === "succeeded") {
    const udids = Array.isArray(body.udids) ? body.udids.filter((u): u is string => typeof u === "string") : [];
    const ipa = typeof body.ipaBase64 === "string" ? Buffer.from(body.ipaBase64, "base64") : null;
    const bundleVersion = typeof body.bundleVersion === "string" ? body.bundleVersion : "";
    if (!udids.length || !ipa?.length || !bundleVersion) {
      return Response.json({ error: "Champs manquants." }, { status: 400 });
    }
    if (ipa.length > MAX_IPA_BYTES) {
      return Response.json({ error: "IPA trop lourde." }, { status: 413 });
    }
    // Only a build still waiting for its result gets a file.
    if ((await getBuild(buildId))?.status !== "queued") {
      return Response.json({ error: "Build inconnu ou déjà terminé." }, { status: 409 });
    }
    const ipaBlobPath = await storeIpa(buildId, ipa);
    await completeBuild(buildId, { status: "succeeded", udids, ipaBlobPath, bundleVersion });
  } else if (body?.status === "failed") {
    await completeBuild(buildId, {
      status: "failed",
      error: typeof body.error === "string" ? body.error.slice(0, 500) : "Échec du workflow.",
    });
  } else {
    return Response.json({ error: "status invalide." }, { status: 400 });
  }

  // Des iPhones enregistrés pendant ce build → on relance.
  await ensureBuildForPendingDevices(new Date());
  return Response.json({ ok: true });
}
