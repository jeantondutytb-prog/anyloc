import { after } from "next/server";
import { markActivated } from "@/lib/activation-server";
import { corsPreflightResponse, jsonWithCors } from "@/lib/cors";
import { extractBearerToken } from "@/lib/device";
import { logError } from "@/lib/log-error";
import {
  getDeviceContext,
  getLocationPayloadForUser,
  touchDeviceLastSeen,
} from "@/lib/device-server";
import {
  parseLocationRequestBody,
  upsertLocationForUser,
} from "@/lib/location-server";

export function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return jsonWithCors(
      { error: "Authorization Bearer token requis." },
      { status: 401 }
    );
  }

  const token = extractBearerToken(request);

  if (!token) {
    return jsonWithCors(
      {
        error:
          "Token appareil invalide. Génère un code sur le dashboard (commence par anyloc_).",
      },
      { status: 401 }
    );
  }

  const { device, error, inactive } = await getDeviceContext(token);

  if (!device) {
    return jsonWithCors({ error }, { status: 401 });
  }

  if (error) {
    return jsonWithCors({ error, inactive }, { status: 403 });
  }

  await touchDeviceLastSeen(device.id);

  const payload = await getLocationPayloadForUser(device.user_id);

  // The Android app applies the active position it reads here. The desktop app
  // reads it too but reports its own success (desktop_location_applied).
  if (device.platform === "android" && payload.location.isActive) {
    after(() => markActivated(device.user_id, "android"));
  }

  return jsonWithCors({
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

  const { device, error, inactive } = await getDeviceContext(token);

  if (!device) {
    return Response.json({ error }, { status: 401 });
  }

  if (error) {
    return Response.json({ error, inactive }, { status: 403 });
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
    if (device.platform === "android") {
      after(() => markActivated(device.user_id, "android"));
    }

    return Response.json({
      device: {
        id: device.id,
        platform: device.platform,
        deviceName: device.device_name,
      },
      ...result,
    });
  } catch (saveError) {
    await logError("device/location/save", saveError, {
      userId: device.user_id,
      device_id: device.id,
      platform: device.platform,
    });
    return Response.json(
      { error: "Impossible d'enregistrer ta position." },
      { status: 500 }
    );
  }
}
