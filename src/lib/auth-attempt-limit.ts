import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/**
 * Password attempts (login and signup share them, both can try a password on
 * an existing account), all over 15 min.
 * - Per email + IP, 5: a real person who forgot their password tries a few
 *   times; someone typing your email from elsewhere does not use up yours.
 * - Per IP, 30: one script cannot sweep many accounts, while a shared
 *   mobile-carrier or school IP (many real people behind one address) still
 *   has room.
 * - Per email, 20 across all IPs: caps guessing one account from many IPs.
 *   A browser that already logged into this account (signed cookie, see
 *   auth-trusted-device.ts) skips it, so an attack from elsewhere does not
 *   lock the owner out of their own device.
 * IPv6 addresses count per /64 (one subscriber usually holds a whole /64).
 */
export const AUTH_ATTEMPT_LIMITS = {
  emailIp: { limit: 5, windowMs: FIFTEEN_MINUTES },
  ip: { limit: 30, windowMs: FIFTEEN_MINUTES },
  email: { limit: 20, windowMs: FIFTEEN_MINUTES },
} as const;

export type AuthAttemptResult = { ok: true } | { ok: false; error: string };

function normalize(email: string) {
  return email.trim().toLowerCase();
}

function known(ip: string) {
  return Boolean(ip) && ip !== "unknown";
}

/** An IPv4 address as is; an IPv6 address reduced to its /64 prefix. */
export function ipBucket(ip: string) {
  const value = ip.trim().toLowerCase();
  if (!value.includes(":")) return value;
  if (value.startsWith("::ffff:") && value.includes(".")) return value.slice(7);

  const [head, tail = ""] = value.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const missing = value.includes("::") ? 8 - left.length - right.length : 0;
  const groups = [...left, ...Array(Math.max(0, missing)).fill("0"), ...right];
  return `${groups
    .slice(0, 4)
    .map((group) => (group || "0").replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}

function emailKey(email: string) {
  return `auth-attempt:email:${normalize(email)}`;
}

function emailIpKey(email: string, bucket: string) {
  return `auth-attempt:email-ip:${normalize(email)}|${bucket}`;
}

export function tooManyAttemptsMessage(retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Trop d'essais. Réessaie dans ${minutes} minute${minutes > 1 ? "s" : ""}.`;
}

/**
 * Counts one password attempt, before Supabase is called. An unknown IP (no
 * Vercel header, e.g. local dev) only counts toward the per-email cap, so it
 * never becomes one strict bucket shared by everybody.
 */
export function checkAuthAttempt({
  email,
  ip,
  trustedDevice = false,
  now = Date.now(),
}: {
  email: string;
  ip: string;
  trustedDevice?: boolean;
  now?: number;
}): AuthAttemptResult {
  const checks: Array<[string, { limit: number; windowMs: number }]> = [];

  if (known(ip)) {
    const bucket = ipBucket(ip);
    checks.push([`auth-attempt:ip:${bucket}`, AUTH_ATTEMPT_LIMITS.ip]);
    checks.push([emailIpKey(email, bucket), AUTH_ATTEMPT_LIMITS.emailIp]);
  }
  if (!trustedDevice) {
    checks.push([emailKey(email), AUTH_ATTEMPT_LIMITS.email]);
  }

  for (const [key, { limit, windowMs }] of checks) {
    const result = rateLimit(key, limit, windowMs, now);
    if (!result.ok) return { ok: false, error: tooManyAttemptsMessage(result.retryAfterSeconds) };
  }

  return { ok: true };
}

/**
 * The right password was given from this IP: its tries start again from
 * zero. The per-email count is left as is, so an attack running from other
 * IPs stays capped.
 */
export function recordAuthSuccess(email: string, ip: string) {
  if (known(ip)) resetRateLimit(emailIpKey(email, ipBucket(ip)));
}
