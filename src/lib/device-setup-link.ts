import { getDefaultApiBaseUrl, sanitizeApiBaseUrl } from "@/lib/api-base-url";

export function getPublicApiBaseUrl() {
  if (typeof window !== "undefined") {
    return sanitizeApiBaseUrl(window.location.origin);
  }

  return getDefaultApiBaseUrl();
}

export function buildMobileSetupLink(token: string, apiBaseUrl?: string) {
  const params = new URLSearchParams({
    token,
    api: sanitizeApiBaseUrl(apiBaseUrl ?? getPublicApiBaseUrl()),
  });

  return `anyloc://setup?${params.toString()}`;
}

export function buildSetupDesktopLink(token: string, apiBaseUrl?: string) {
  const params = new URLSearchParams({
    token,
    api: sanitizeApiBaseUrl(apiBaseUrl ?? getPublicApiBaseUrl()),
  });

  return `anyloc-setup://configure?${params.toString()}`;
}

export function getPendingTokenStorageKey(platform: "ios" | "android") {
  return `anyloc-pending-token-${platform}`;
}
