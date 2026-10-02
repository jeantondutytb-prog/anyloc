/**
 * Best-effort fixed-window limiter kept in the function instance's memory.
 * Vercel reuses warm instances, so this stops bursts from one client; it is
 * not a global quota (that would need a shared store or a firewall rule).
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 10_000;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) {
      for (const [storedKey, stored] of windows) {
        if (stored.resetAt <= now) windows.delete(storedKey);
      }
      if (windows.size >= MAX_TRACKED_KEYS) windows.clear();
    }

    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (current.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;
  return { ok: true };
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function tooManyRequests(retryAfterSeconds: number) {
  return Response.json(
    { error: "Trop de requêtes. Réessaie dans un instant." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

/** Limits by client IP under a route-specific bucket; returns a 429 or null. */
export function limitByIp(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number
) {
  const result = rateLimit(`${bucket}:${getClientIp(request)}`, limit, windowMs);
  return result.ok ? null : tooManyRequests(result.retryAfterSeconds);
}
