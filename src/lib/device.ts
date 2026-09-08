import { createHash, randomBytes } from "node:crypto";

export type DevicePlatform = "android" | "ios";

export type DeviceTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  platform: DevicePlatform;
  device_name: string;
  last_seen_at: string | null;
  created_at: string;
};

export type DeviceSummary = {
  id: string;
  platform: DevicePlatform;
  deviceName: string;
  lastSeenAt: string | null;
  createdAt: string;
};

const TOKEN_PREFIX = "anyloc_";

export function isValidDevicePlatform(value: unknown): value is DevicePlatform {
  return value === "android" || value === "ios";
}

export function generateDeviceToken() {
  const random = randomBytes(32).toString("base64url");
  return `${TOKEN_PREFIX}${random}`;
}

export function hashDeviceToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function extractBearerToken(request: Request) {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();

  if (!token.startsWith(TOKEN_PREFIX)) {
    return null;
  }

  return token;
}

export function mapDeviceRow(row: DeviceTokenRow): DeviceSummary {
  return {
    id: row.id,
    platform: row.platform,
    deviceName: row.device_name,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
  };
}

export function parseDeviceRegisterBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const platform = record.platform;

  if (!isValidDevicePlatform(platform)) {
    return null;
  }

  const deviceName =
    typeof record.deviceName === "string" && record.deviceName.trim()
      ? record.deviceName.trim().slice(0, 80)
      : platform === "android"
        ? "Android"
        : "iPhone";

  return { platform, deviceName };
}
