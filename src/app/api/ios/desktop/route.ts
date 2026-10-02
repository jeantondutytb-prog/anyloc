import { presignPrivateBlobUrl } from "@/lib/downloads";
import { isEligibleForIosAdhoc } from "@/lib/ios-adhoc/config";
import { getIosStatusForUser, registerIosDeviceFromDesktop } from "@/lib/ios-adhoc/service";
import { getBuild } from "@/lib/ios-adhoc/store";
import { requireActiveSubscription } from "@/lib/subscription";

// Utilisé par Anyloc Setup (Bearer) : l'ordinateur lit l'UDID en USB,
// enregistre l'iPhone, puis télécharge l'IPA signée pour l'installer en USB.

const NO_STORE = { "Cache-Control": "no-store" };

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 64) : null;
}

export async function GET() {
  const { user, access, error } = await requireActiveSubscription();

  if (!user) {
    return Response.json({ error }, { status: 401 });
  }

  if (!isEligibleForIosAdhoc(access)) {
    return Response.json({ eligible: false }, { headers: NO_STORE });
  }

  const state = await getIosStatusForUser(user.id, new Date());
  let ipaUrl: string | null = null;

  if (state.kind === "ready") {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const build = await getBuild(state.buildId);
    if (!blobToken || !build?.ipa_blob_path) {
      return Response.json({ error: "Installation indisponible." }, { status: 503 });
    }
    ipaUrl = await presignPrivateBlobUrl(build.ipa_blob_path, blobToken);
  }

  return Response.json({ eligible: true, state, ipaUrl }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const { user, access, error } = await requireActiveSubscription();

  if (!user) {
    return Response.json({ error }, { status: 401 });
  }

  if (!isEligibleForIosAdhoc(access)) {
    return Response.json({ error: "L'app iPhone est incluse dans la formule 1 an." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const udid = readOptionalString(body?.udid);

  if (!udid) {
    return Response.json({ error: "iPhone non reconnu. Rebranche-le et réessaie." }, { status: 400 });
  }

  const result = await registerIosDeviceFromDesktop(
    user.id,
    { udid, product: readOptionalString(body?.product), osVersion: readOptionalString(body?.osVersion) },
    new Date()
  );

  if (!result.ok) {
    return Response.json({ error: result.message }, { status: 409 });
  }

  return Response.json({ ok: true }, { headers: NO_STORE });
}
