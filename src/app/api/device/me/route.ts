import { extractBearerToken } from "@/lib/device";
import { getDeviceByToken, touchDeviceLastSeen } from "@/lib/device-server";
import { getSubscriptionAccessForUser } from "@/lib/subscription";

export async function GET(request: Request) {
  const token = extractBearerToken(request);

  if (!token) {
    return Response.json(
      { error: "Authorization Bearer token requis." },
      { status: 401 }
    );
  }

  const device = await getDeviceByToken(token);

  if (!device) {
    return Response.json({ error: "Token appareil invalide." }, { status: 401 });
  }

  const access = await getSubscriptionAccessForUser(device.user_id);

  await touchDeviceLastSeen(device.id);

  return Response.json({
    device: {
      id: device.id,
      platform: device.platform,
      deviceName: device.device_name,
      lastSeenAt: new Date().toISOString(),
    },
    subscription: {
      active: access.hasAccess,
      status: access.status,
      planId: access.planId,
    },
  });
}
