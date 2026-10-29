import { extractBearerToken } from "@/lib/device";
import { getDeviceByToken, touchDeviceLastSeen } from "@/lib/device-server";
import { buildSubscriptionAccessResponse } from "@/lib/subscription-access-api";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/** The Android app shows the account email on its profile page. */
async function loadUserEmail(userId: string) {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await createAdminClient().auth.admin.getUserById(userId);

  return error ? null : (data.user?.email ?? null);
}

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

  const email = await loadUserEmail(device.user_id);
  const access = await buildSubscriptionAccessResponse(device.user_id, email);

  await touchDeviceLastSeen(device.id);

  return Response.json({
    device: {
      id: device.id,
      platform: device.platform,
      deviceName: device.device_name,
      lastSeenAt: new Date().toISOString(),
    },
    user: { email },
    subscription: {
      active: access.hasAccess,
      status: access.status,
      planId: access.planId,
      isTrial: access.isTrial,
      inactive: access.inactive,
    },
  });
}
