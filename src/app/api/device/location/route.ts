import { extractBearerToken } from "@/lib/device";
import {
  getDeviceContext,
  getLocationPayloadForUser,
  touchDeviceLastSeen,
} from "@/lib/device-server";
import {
  parseLocationRequestBody,
  upsertLocationForUser,
} from "@/lib/location-server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Authorization Bearer token requis." },
      { status: 401 }
    );
  }

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

  const payload = await getLocationPayloadForUser(device.user_id);

  return Response.json({
    device: {
      id: device.id,
      platform: device.platform,
      deviceName: device.device_name,
    },
    ...payload,
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const payload = parseLocationRequestBody(body);

  if (!payload) {
    return Response.json(
      { error: "Position invalide. Vérifie le nom et les coordonnées." },
      { status: 400 }
    );
  }

  try {
    const result = await upsertLocationForUser(device.user_id, payload);
    await touchDeviceLastSeen(device.id);

    return Response.json({
      device: {
        id: device.id,
        platform: device.platform,
        deviceName: device.device_name,
      },
      ...result,
    });
  } catch (saveError) {
    console.error("[device/location] Save failed:", saveError);
    return Response.json(
      { error: "Impossible d'enregistrer ta position." },
      { status: 500 }
    );
  }
}
