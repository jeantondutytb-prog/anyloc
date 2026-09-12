import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  DEFAULT_LOCATION,
  mapLocationRow,
  resolveLocation,
  toLocationResponse,
} from "@/lib/location";
import { hashDeviceToken, isTrialExpired, type DeviceTokenRow } from "@/lib/device";
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
        mode: "static" as const,
        waypoints: [],
        speedKmh: 40,
        routeStartedAt: null,
        routeProgress: null,
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
        mode: "static" as const,
        waypoints: [],
        speedKmh: 40,
        routeStartedAt: null,
        routeProgress: null,
        updatedAt: null,
      },
    };
  }

  const mapped = mapLocationRow(data);
  const resolved = resolveLocation(mapped);

  return {
    location: {
      name: resolved.name,
      lat: resolved.lat,
      lng: resolved.lng,
      accuracy: resolved.accuracy,
      isActive: resolved.isActive,
      mode: resolved.mode,
      waypoints: resolved.waypoints,
      speedKmh: resolved.speedKmh,
      routeStartedAt: resolved.routeStartedAt,
      routeProgress: resolved.routeProgress,
      updatedAt: resolved.updatedAt,
    },
  };
}

export async function getDeviceContext(token: string) {
  const device = await getDeviceByToken(token);

  if (!device) {
    return { device: null, access: null, error: "Token appareil invalide." };
  }

  if (device.is_trial) {
    if (isTrialExpired(device)) {
      return {
        device,
        access: null,
        error: "Ton essai gratuit est terminé. Active ton abonnement pour continuer.",
      };
    }

    return { device, access: null, error: null };
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
