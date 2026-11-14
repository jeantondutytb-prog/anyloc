import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/**
 * Password attempts (login and signup share them, both can try a password on
 * an existing account), all over 15 min.
 * - Per email + IP, 5: a real person who forgot their password tries a few
 *   times then resets it. Keyed on the pair so that someone typing your email
 *   from elsewhere does not lock you out on your own connection.
 * - Per IP, 30: one script cannot sweep many accounts, while a shared
 *   mobile-carrier or school IP (many real people behind one address) still
 *   has room.
 * - Per email, 100: a wide cap against guessing one account from many IPs.
 *   Locking someone out this way takes at least 4 IPs (each stops at 30).
 */
export const AUTH_ATTEMPT_LIMITS = {
  emailIp: { limit: 5, windowMs: FIFTEEN_MINUTES },
  ip: { limit: 30, windowMs: FIFTEEN_MINUTES },
  email: { limit: 100, windowMs: FIFTEEN_MINUTES },
} as const;

export type AuthAttemptResult = { ok: true } | { ok: false; error: string };

function normalize(email: string) {
  return email.trim().toLowerCase();
}

function emailKey(email: string) {
  return `auth-attempt:email:${normalize(email)}`;
}

function emailIpKey(email: string, ip: string) {
  return `auth-attempt:email-ip:${normalize(email)}|${ip}`;
}

function known(ip: string) {
  return Boolean(ip) && ip !== "unknown";
}

export function tooManyAttemptsMessage(retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Trop d'essais. Réessaie dans ${minutes} minute${minutes > 1 ? "s" : ""}, ou réinitialise ton mot de passe.`;
}

/**
 * Counts one password attempt, before Supabase is called. An unknown IP (no
 * Vercel header, e.g. local dev) only counts toward the wide per-email cap, so
 * it never becomes one strict bucket shared by everybody.
 */
export function checkAuthAttempt({
  email,
  ip,
  now = Date.now(),
}: {
  email: string;
  ip: string;
  now?: number;
}): AuthAttemptResult {
  const checks: Array<[string, { limit: number; windowMs: number }]> = [];
  if (known(ip)) {
    checks.push([`auth-attempt:ip:${ip}`, AUTH_ATTEMPT_LIMITS.ip]);
    checks.push([emailIpKey(email, ip), AUTH_ATTEMPT_LIMITS.emailIp]);
  }
  checks.push([emailKey(email), AUTH_ATTEMPT_LIMITS.email]);

  for (const [key, { limit, windowMs }] of checks) {
    const result = rateLimit(key, limit, windowMs, now);
    if (!result.ok) return { ok: false, error: tooManyAttemptsMessage(result.retryAfterSeconds) };
  }

  return { ok: true };
}

/** The right password was given: this email starts again from zero. */
export function clearAuthAttempts(email: string, ip: string) {
  resetRateLimit(emailKey(email));
  if (known(ip)) resetRateLimit(emailIpKey(email, ip));
}
