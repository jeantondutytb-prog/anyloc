import { extractBearerToken } from "@/lib/device";
import { getDeviceContext, touchDeviceLastSeen } from "@/lib/device-server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

const MAX_PAIRING_DATA_BYTES = 64 * 1024;

function parsePairingBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const pairing = (body as Record<string, unknown>).pairing;

  if (typeof pairing !== "string" || !pairing.trim()) {
    return null;
  }

  const trimmed = pairing.trim();

  try {
    const decoded = Buffer.from(trimmed, "base64");

    if (!decoded.length || decoded.length > MAX_PAIRING_DATA_BYTES) {
      return null;
    }
  } catch {
    return null;
  }

  return trimmed;
}

export async function GET(request: Request) {
  const token = extractBearerToken(request);

  if (!token) {
    return Response.json(
      {
        error:
          "Token appareil invalide. Génère un code sur le dashboard (commence par anyloc_).",
      },
      { status: 401 }
    );
  }

  const { device, error } = await getDeviceContext(token);

  if (!device) {
    return Response.json({ error }, { status: 401 });
  }

  if (error) {
    return Response.json({ error }, { status: 403 });
  }

  await touchDeviceLastSeen(device.id);

  return Response.json({
    ok: true,
    pairing: device.pairing_data ?? null,
  });
}

export async function PUT(request: Request) {
  const token = extractBearerToken(request);

  if (!token) {
    return Response.json(
      {
        error:
          "Token appareil invalide. Génère un code sur le dashboard (commence par anyloc_).",
      },
      { status: 401 }
    );
  }

  const { device, error } = await getDeviceContext(token);

  if (!device) {
    return Response.json({ error }, { status: 401 });
  }

  if (error) {
    return Response.json({ error }, { status: 403 });
  }

  if (!isSupabaseAdminConfigured()) {
    return Response.json(
      { error: "Stockage pairing indisponible." },
      { status: 503 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const pairing = parsePairingBody(body);

  if (!pairing) {
    return Response.json(
      {
        error:
          "Pairing invalide. Envoie un fichier base64 de moins de 64 Ko.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("device_tokens")
    .update({ pairing_data: pairing })
    .eq("id", device.id);

  if (updateError) {
    console.error("[device/pairing] Save failed:", updateError);
    return Response.json(
      { error: "Impossible d'enregistrer le pairing." },
      { status: 500 }
    );
  }

  await touchDeviceLastSeen(device.id);

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const token = extractBearerToken(request);

  if (!token) {
    return Response.json(
      {
        error:
          "Token appareil invalide. Génère un code sur le dashboard (commence par anyloc_).",
      },
      { status: 401 }
    );
  }

  const { device, error } = await getDeviceContext(token);

  if (!device) {
    return Response.json({ error }, { status: 401 });
  }

  if (error) {
    return Response.json({ error }, { status: 403 });
  }

  if (!isSupabaseAdminConfigured()) {
    return Response.json(
      { error: "Stockage pairing indisponible." },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("device_tokens")
    .update({ pairing_data: null })
    .eq("id", device.id);

  if (updateError) {
    console.error("[device/pairing] Delete failed:", updateError);
    return Response.json(
      { error: "Impossible de supprimer le pairing." },
      { status: 500 }
    );
  }

  await touchDeviceLastSeen(device.id);

  return Response.json({ ok: true });
}
