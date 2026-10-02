import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  DEFAULT_LOCATION,
  mapLocationRow,
  resolveLocation,
} from "@/lib/location";
import { hashDeviceToken, type DeviceTokenRow } from "@/lib/device";
import { buildSubscriptionAccessResponse } from "@/lib/subscription-access-api";
import { getSubscriptionAccessForUser, isActiveSubscriptionStatus } from "@/lib/subscription";

/** Caps linked devices so one subscription can't be shared across a group. */
export const MAX_DEVICES_PER_USER = 10;

export const DEVICE_LIMIT_ERROR = `Tu as atteint la limite de ${MAX_DEVICES_PER_USER} appareils. Supprime un ancien appareil dans Paramètres pour en ajouter un.`;

export async function hasReachedDeviceLimit(userId: string) {
  if (!isSupabaseAdminConfigured()) {
    return false;
  }

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("device_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("[device] Count failed:", error);
    return false;
  }

  return (count ?? 0) >= MAX_DEVICES_PER_USER;
}

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

  const access = await getSubscriptionAccessForUser(device.user_id);

  if (!access.hasAccess) {
    const subscription = await buildSubscriptionAccessResponse(device.user_id);

    return {
      device,
      access,
      error: "Abonnement inactif. Renouvelle ton accès Anyloc.",
      inactive: subscription.inactive,
    };
  }

  return { device, access, error: null, inactive: null };
}

export function formatSubscriptionStatus(status: string | null) {
  return isActiveSubscriptionStatus(status) ? "active" : status;
}
