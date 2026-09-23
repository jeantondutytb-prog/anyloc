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

function isLocalHost(host: string) {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getOAuthCallbackOrigin(request: Request) {
  // Always use the host the user is actually on. Vercel may redirect apex ↔ www,
  // and bouncing to NEXT_PUBLIC_APP_URL causes ERR_TOO_MANY_REDIRECTS.
  return getRequestOrigin(request);
}

export function getOAuthCallbackUrl(request: Request) {
  return `${getOAuthCallbackOrigin(request)}/auth/callback`;
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
