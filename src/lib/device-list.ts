/**
 * Linked devices as shown in Paramètres. No server import here: the settings
 * screen is a client component.
 */

/** Caps linked devices so one subscription can't be shared across a group. */
export const MAX_DEVICES_PER_USER = 10;

export type DeviceItem = {
  id: string;
  platform: "android" | "ios";
  deviceName: string;
  lastSeenAt: string | null;
  createdAt: string;
};

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
}

/**
 * The title and the line under it. A link no app ever used says so, with the
 * day it was made, so the customer knows which ones to remove first.
 */
export function describeDevice(device: DeviceItem) {
  const platform = device.platform === "android" ? "Android" : "iPhone";
  const title = device.deviceName.trim() || platform;
  const detail = device.lastSeenAt
    ? `${platform} · utilisé le ${formatDay(device.lastSeenAt)}`
    : `${platform} · jamais utilisé · créé le ${formatDay(device.createdAt)}`;

  return { title, detail };
}
