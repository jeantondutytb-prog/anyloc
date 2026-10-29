/**
 * Install steps reported by the desktop app (Mac / Windows), which PostHog
 * cannot see on its own: from first launch to the first location applied on
 * the iPhone. Anything not listed here is dropped.
 */
export const DESKTOP_APP_EVENTS = [
  "desktop_app_opened",
  "desktop_logged_in",
  "desktop_guide_step_viewed",
  "desktop_tools_ready",
  "desktop_tools_failed",
  "desktop_windows_stage",
  "desktop_windows_repaired",
  "desktop_iphone_detected",
  "desktop_iphone_trust_waiting",
  "desktop_iphone_trusted",
  "desktop_devmode_enabled",
  "desktop_devmode_failed",
  "desktop_iphone_app_installed",
  "desktop_iphone_app_install_failed",
  "desktop_guide_completed",
  "desktop_location_applied",
  "desktop_location_failed",
] as const;

export type DesktopAppEvent = (typeof DESKTOP_APP_EVENTS)[number];

export type AppEventReport = {
  event: DesktopAppEvent;
  installId: string;
  appVersion: string | null;
  properties: Record<string, string | number | boolean>;
};

const MAX_PROPERTY_KEYS = 20;
const INSTALL_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates an event sent by the desktop app; anything unexpected is dropped. */
export function parseAppEventReport(body: unknown): AppEventReport | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const raw = body as Record<string, unknown>;
  const event = DESKTOP_APP_EVENTS.find((item) => item === raw.event);
  const installId = typeof raw.install_id === "string" ? raw.install_id : "";

  if (!event || !INSTALL_ID_PATTERN.test(installId)) {
    return null;
  }

  const properties: AppEventReport["properties"] = {};

  if (typeof raw.properties === "object" && raw.properties !== null) {
    for (const [key, value] of Object.entries(raw.properties).slice(0, MAX_PROPERTY_KEYS)) {
      if (!/^\w{1,40}$/.test(key)) {
        continue;
      }

      if (typeof value === "string") {
        properties[key] = value.slice(0, 200);
      } else if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) {
        properties[key] = value;
      }
    }
  }

  const appVersion =
    typeof raw.app_version === "string" && raw.app_version.trim()
      ? raw.app_version.trim().slice(0, 40)
      : null;

  return { event, installId: installId.toLowerCase(), appVersion, properties };
}

/** PostHog id of a desktop install whose user is not known yet (before login). */
export function desktopInstallDistinctId(installId: string) {
  return `desktop:${installId}`;
}
