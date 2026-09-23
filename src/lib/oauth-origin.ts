function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function getRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost || firstHeaderValue(request.headers.get("host")) || url.host;
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const proto =
    forwardedProto ||
    url.protocol.replace(":", "") ||
    (isLocalHost(host) ? "http" : "https");

  return `${proto}://${host}`;
}

export function normalizeOrigin(raw: string) {
  const value = raw.trim();

  if (!value) {
    return "";
  }

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    if (!isLocalHost(url.hostname) && url.protocol === "http:") {
      url.protocol = "https:";
    }

    return url.origin;
  } catch {
    return "";
  }
}

export function getConfiguredAppOrigin(
  appUrl = process.env.NEXT_PUBLIC_APP_URL,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL
) {
  return normalizeOrigin(appUrl ?? "") || normalizeOrigin(siteUrl ?? "");
}

function hostnameOf(origin: string) {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isLocalHost(host: string) {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isPreviewHost(host: string) {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return hostname.endsWith(".vercel.app");
}

function registrableDomain(host: string) {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  const parts = hostname.split(".").filter(Boolean);

  if (parts.length < 2) {
    return hostname;
  }

  return parts.slice(-2).join(".");
}

export function getOAuthCallbackOrigin(
  request: Request,
  configuredOrigin = getConfiguredAppOrigin()
) {
  const requestOrigin = getRequestOrigin(request);
  const requestHost = hostnameOf(requestOrigin);

  if (isLocalHost(requestHost) || isPreviewHost(requestHost) || !configuredOrigin) {
    return requestOrigin;
  }

  const configuredHost = hostnameOf(configuredOrigin);

  if (!configuredHost) {
    return requestOrigin;
  }

  if (registrableDomain(requestHost) !== registrableDomain(configuredHost)) {
    return requestOrigin;
  }

  return configuredOrigin;
}

export function getOAuthCallbackUrl(request: Request) {
  return `${getOAuthCallbackOrigin(request)}/auth/callback`;
}

export function shouldBounceToOAuthOrigin(request: Request) {
  return getRequestOrigin(request) !== getOAuthCallbackOrigin(request);
}

export function buildOAuthStartUrl(request: Request, next: string) {
  const url = new URL("/auth/google", getOAuthCallbackOrigin(request));
  url.searchParams.set("next", next);
  return url;
}

export function isSiteUrlOAuthFallback(
  pathname: string,
  searchParams: URLSearchParams
) {
  if (pathname !== "/") {
    return false;
  }

  return searchParams.has("code") || searchParams.has("error");
}
