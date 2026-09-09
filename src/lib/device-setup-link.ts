export function getPublicApiBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }

  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.anyloc.io").replace(
    /\/$/,
    ""
  );
}

export function buildMobileSetupLink(token: string, apiBaseUrl?: string) {
  const params = new URLSearchParams({
    token,
    api: apiBaseUrl ?? getPublicApiBaseUrl(),
  });

  return `anyloc://setup?${params.toString()}`;
}

export function buildSetupDesktopLink(token: string, apiBaseUrl?: string) {
  const params = new URLSearchParams({
    token,
    api: apiBaseUrl ?? getPublicApiBaseUrl(),
  });

  return `anyloc-setup://configure?${params.toString()}`;
}

export function getPendingTokenStorageKey(platform: "ios" | "android") {
  return `anyloc-pending-token-${platform}`;
}
