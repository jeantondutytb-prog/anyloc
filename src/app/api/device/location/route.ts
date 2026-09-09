import { createClient } from "@/lib/supabase/server";
import { extractBearerToken } from "@/lib/device";
import {
  getDeviceContext,
  getLocationPayloadForUser,
  touchDeviceLastSeen,
} from "@/lib/device-server";

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
