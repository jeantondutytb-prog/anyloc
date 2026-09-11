const ALLOWED_REDIRECT_PREFIXES = [
  "/dashboard",
  "/checkout",
  "/onboarding",
  "/web",
  "/pricing",
  "/contact",
  "/a-propos",
  "/communaute",
  "/affiliation",
  "/setup",
];

function isAllowedRedirectPath(pathname: string) {
  return ALLOWED_REDIRECT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function sanitizeRedirectPath(
  raw: string | null | undefined,
  fallback = "/dashboard"
) {
  const value = raw?.trim() ?? "";

  if (!value) {
    return fallback;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  const path = value.startsWith("/") ? value : `/${value}`;
  const pathname = path.split("?")[0]?.split("#")[0] ?? "";

  if (!isAllowedRedirectPath(pathname)) {
    return fallback;
  }

  return path;
}
