export const APP_ERROR_PLATFORMS = ["ios", "android", "desktop"] as const;

export type AppErrorPlatform = (typeof APP_ERROR_PLATFORMS)[number];

export type AppErrorReport = {
  platform: AppErrorPlatform;
  scope: string;
  message: string;
  appVersion: string | null;
  context: Record<string, string | number | boolean>;
};

const MAX_CONTEXT_KEYS = 20;

function shortString(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

/** Validates an error sent by one of the apps; anything unexpected is dropped. */
export function parseAppErrorReport(body: unknown): AppErrorReport | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const raw = body as Record<string, unknown>;
  const platform = APP_ERROR_PLATFORMS.find((item) => item === raw.platform);
  const scope = shortString(raw.scope, 80);
  const message = shortString(raw.message, 2000);

  if (!platform || !scope || !/^[\w./-]+$/.test(scope) || !message) {
    return null;
  }

  const context: AppErrorReport["context"] = {};

  if (typeof raw.context === "object" && raw.context !== null) {
    for (const [key, value] of Object.entries(raw.context).slice(0, MAX_CONTEXT_KEYS)) {
      if (!/^\w{1,40}$/.test(key)) {
        continue;
      }

      if (typeof value === "string") {
        context[key] = value.slice(0, 500);
      } else if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) {
        context[key] = value;
      }
    }
  }

  return {
    platform,
    scope,
    message,
    appVersion: shortString(raw.app_version, 40),
    context,
  };
}
