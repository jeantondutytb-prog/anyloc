import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { DEFAULT_LOCATION, mapLocationRow } from "@/lib/location";
import { hashDeviceToken, type DeviceTokenRow } from "@/lib/device";
import { getSubscriptionAccessForUser, isActiveSubscriptionStatus } from "@/lib/subscription";

export async function getDeviceByToken(token: string) {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("device_tokens")
    .select("*")
    .eq("token_hash", hashDeviceToken(token))
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as DeviceTokenRow;
}

export async function touchDeviceLastSeen(deviceId: string) {
  if (!isSupabaseAdminConfigured()) {
    return;
  }

  const admin = createAdminClient();
  await admin
    .from("device_tokens")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", deviceId);
}

export async function getLocationPayloadForUser(userId: string) {
  if (!isSupabaseAdminConfigured()) {
    return {
      location: {
        name: DEFAULT_LOCATION.name,
        lat: DEFAULT_LOCATION.lat,
        lng: DEFAULT_LOCATION.lng,
        accuracy: DEFAULT_LOCATION.accuracy,
        isActive: false,
        updatedAt: null,
      },
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("location_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Impossible de charger la position.");
  }

  if (!data) {
    return {
      location: {
        name: DEFAULT_LOCATION.name,
        lat: DEFAULT_LOCATION.lat,
        lng: DEFAULT_LOCATION.lng,
        accuracy: DEFAULT_LOCATION.accuracy,
        isActive: false,
        updatedAt: null,
      },
    };
  }

  const mapped = mapLocationRow(data);

  return {
    location: {
      name: mapped.name,
      lat: mapped.lat,
      lng: mapped.lng,
      accuracy: mapped.accuracy,
      isActive: mapped.isActive,
      updatedAt: mapped.updatedAt,
    },
  };
}

export async function getDeviceContext(token: string) {
  const device = await getDeviceByToken(token);

  if (!device) {
    return { device: null, access: null, error: "Token appareil invalide." };
  }

  const access = await getSubscriptionAccessForUser(device.user_id);

  if (!access.hasAccess) {
    return {
      device,
      access,
      error: "Abonnement inactif. Renouvelle ton accès Anyloc.",
    };
  }

  return { device, access, error: null };
}

export function formatSubscriptionStatus(status: string | null) {
  return isActiveSubscriptionStatus(status) ? "active" : status;
}
