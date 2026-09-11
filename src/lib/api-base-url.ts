const DEFAULT_API_BASE_URL = "https://www.anyloc.io";

const ALLOWED_API_HOSTS = new Set([
  "anyloc.io",
  "www.anyloc.io",
  "localhost",
  "127.0.0.1",
]);

function normalizeHost(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function isAllowedApiHost(hostname: string) {
  const host = normalizeHost(hostname);

  if (ALLOWED_API_HOSTS.has(host)) {
    return true;
  }

  if (host.endsWith(".vercel.app")) {
    return true;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (appUrl) {
    try {
      const configuredHost = normalizeHost(new URL(appUrl).hostname);
      return host === configuredHost;
    } catch {
      return false;
    }
  }

  return false;
}

export function getDefaultApiBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (appUrl) {
    try {
      const parsed = new URL(appUrl);

      if (isAllowedApiHost(parsed.hostname)) {
        return parsed.origin.replace(/\/$/, "");
      }
    } catch {
      // Fall back to production default.
    }
  }

  return DEFAULT_API_BASE_URL;
}

export function sanitizeApiBaseUrl(raw: string | null | undefined) {
  const fallback = getDefaultApiBaseUrl();
  const value = raw?.trim();

  if (!value) {
    return fallback;
  }

  try {
    const parsed = new URL(value.includes("://") ? value : `https://${value}`);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return fallback;
    }

    if (!isAllowedApiHost(parsed.hostname)) {
      return fallback;
    }

    return parsed.origin.replace(/\/$/, "");
  } catch {
    return fallback;
  }
}
