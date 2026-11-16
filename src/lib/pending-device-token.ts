import { getPendingTokenStorageKey } from "@/lib/device-setup-link";

/**
 * Link token kept in sessionStorage between two taps on "Ouvrir Anyloc sur mon
 * tel", so each tap doesn't create a new device (the account is capped at 10).
 * The device id is kept with it to check that the link still exists.
 */
export type PendingDeviceToken = {
  token: string;
  deviceId: string;
  apiBaseUrl: string;
};

export type PendingTokenPlatform = "ios" | "android";

type TokenStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** A cached entry without a device id (older versions) can't be checked: dropped. */
export function parsePendingDeviceToken(raw: string | null): PendingDeviceToken | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingDeviceToken>;
    if (
      typeof parsed.token === "string" &&
      parsed.token.startsWith("anyloc_") &&
      typeof parsed.deviceId === "string" &&
      parsed.deviceId &&
      typeof parsed.apiBaseUrl === "string"
    ) {
      return { token: parsed.token, deviceId: parsed.deviceId, apiBaseUrl: parsed.apiBaseUrl };
    }
  } catch {}

  return null;
}

export type ResolvePendingTokenDeps = {
  storage: TokenStorage | null;
  platform: PendingTokenPlatform;
  /** Ids of the account's devices, or null when the list could not be loaded. */
  listDeviceIds(): Promise<string[] | null>;
  createDevice(): Promise<PendingDeviceToken>;
};

/**
 * Returns the token to put in the setup link: the cached one only while its
 * device still exists on the account (a deleted or revoked link answers 401 to
 * the app forever), otherwise a new one.
 */
export async function resolvePendingDeviceToken({
  storage,
  platform,
  listDeviceIds,
  createDevice,
}: ResolvePendingTokenDeps): Promise<{ pending: PendingDeviceToken; created: boolean }> {
  const key = getPendingTokenStorageKey(platform);
  const cached = parsePendingDeviceToken(safeGet(storage, key));

  if (cached) {
    const ids = await listDeviceIds().catch(() => null);
    if (ids?.includes(cached.deviceId)) {
      return { pending: cached, created: false };
    }
  }

  safeRemove(storage, key);
  const pending = await createDevice();
  try {
    storage?.setItem(key, JSON.stringify(pending));
  } catch {}

  return { pending, created: true };
}

/** After a device is deleted: forget any cached link made for it. */
export function forgetPendingDeviceToken(storage: TokenStorage | null, deletedDeviceId: string) {
  for (const platform of ["ios", "android"] as const) {
    const key = getPendingTokenStorageKey(platform);
    const raw = safeGet(storage, key);
    if (raw === null) continue;

    const cached = parsePendingDeviceToken(raw);
    if (!cached || cached.deviceId === deletedDeviceId) {
      safeRemove(storage, key);
    }
  }
}

function safeGet(storage: TokenStorage | null, key: string) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeRemove(storage: TokenStorage | null, key: string) {
  try {
    storage?.removeItem(key);
  } catch {}
}
