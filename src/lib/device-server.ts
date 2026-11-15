import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  DEFAULT_LOCATION,
  mapLocationRow,
  resolveLocation,
} from "@/lib/location";
import { hashDeviceToken, type DeviceTokenRow } from "@/lib/device";
import { MAX_DEVICES_PER_USER } from "@/lib/device-list";
import { buildSubscriptionAccessResponse } from "@/lib/subscription-access-api";
import {
  getSubscriptionAccessForUser,
  isActiveSubscriptionStatus,
  type SubscriptionAccess,
} from "@/lib/subscription";

export { MAX_DEVICES_PER_USER };

export const DEVICE_LIMIT_ERROR = `Tu as atteint la limite de ${MAX_DEVICES_PER_USER} appareils. Supprime un appareil que tu n'utilises plus dans Mon compte, rubrique Appareils, pour en ajouter un.`;

export async function hasReachedDeviceLimit(
  userId: string,
  access: Pick<SubscriptionAccess, "isAdmin"> | null
) {
  // Admin accounts can link as many devices as they want. `access.isAdmin` is
  // only set once the admin email is confirmed, unlike a raw email match.
  if (access?.isAdmin || !isSupabaseAdminConfigured()) {
    return false;
  }

  return checkDeviceLimit(userId, adminDeviceLimitStore());
}

/**
 * A link that no device has used after this long (no call to the API, no
 * pairing) is freed when the user hits the limit: the app it was made for never
 * connected, often because a page created a new link on each visit.
 */
export const UNUSED_DEVICE_TTL_MS = 24 * 60 * 60 * 1000;

export function unusedDeviceCutoff(now = Date.now()) {
  return new Date(now - UNUSED_DEVICE_TTL_MS).toISOString();
}

export type DeviceLimitStore = {
  /** Every link of the user, used or not. Null when the count failed. */
  countDevices(userId: string): Promise<number | null>;
  /**
   * Deletes at most `max` of the user's links never used and created before
   * `cutoff`, oldest first; returns how many were deleted.
   */
  deleteUnusedDevicesBefore(userId: string, cutoff: string, max: number): Promise<number>;
};

/**
 * True when the user can't add a device. Unused links are only deleted once the
 * limit is reached, and only as many as needed for one more device, oldest
 * first: while there is room, a link made today or a shortcut saved but not
 * used yet is never touched. Unused links still count until deleted, so they
 * can't be stockpiled to get around the limit.
 */
export async function checkDeviceLimit(
  userId: string,
  store: DeviceLimitStore,
  now = Date.now()
) {
  const count = await store.countDevices(userId);

  if (count === null || count < MAX_DEVICES_PER_USER) {
    return false;
  }

  const needed = count - MAX_DEVICES_PER_USER + 1;
  const freed = await store.deleteUnusedDevicesBefore(userId, unusedDeviceCutoff(now), needed);
  return count - freed >= MAX_DEVICES_PER_USER;
}

function adminDeviceLimitStore(): DeviceLimitStore {
  const admin = createAdminClient();

  return {
    async countDevices(userId) {
      const { count, error } = await admin
        .from("device_tokens")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (error) {
        console.error("[device] Count failed:", error);
        return null;
      }

      return count ?? 0;
    },
    async deleteUnusedDevicesBefore(userId, cutoff, max) {
      const { data: stale, error: selectError } = await admin
        .from("device_tokens")
        .select("id")
        .eq("user_id", userId)
        .is("last_seen_at", null)
        .is("pairing_data", null)
        .lt("created_at", cutoff)
        .order("created_at", { ascending: true })
        .limit(max);

      if (selectError || !stale?.length) {
        if (selectError) console.error("[device] Unused links lookup failed:", selectError);
        return 0;
      }

      // Same filters again, so a link used in the meantime is kept.
      const { data, error } = await admin
        .from("device_tokens")
        .delete()
        .in("id", stale.map((device) => device.id))
        .eq("user_id", userId)
        .is("last_seen_at", null)
        .is("pairing_data", null)
        .select("id");

      if (error) {
        console.error("[device] Unused links cleanup failed:", error);
        return 0;
      }

      return data?.length ?? 0;
    },
  };
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
