import { timingSafeEqual } from "node:crypto";
import { ensureBuildForPendingDevices } from "@/lib/ios-adhoc/service";
import { completeBuild } from "@/lib/ios-adhoc/store";

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
    const ipaBlobPath = typeof body.ipaBlobPath === "string" ? body.ipaBlobPath : "";
    const bundleVersion = typeof body.bundleVersion === "string" ? body.bundleVersion : "";
    if (!udids.length || !ipaBlobPath || !bundleVersion) {
      return Response.json({ error: "Champs manquants." }, { status: 400 });
    }
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
