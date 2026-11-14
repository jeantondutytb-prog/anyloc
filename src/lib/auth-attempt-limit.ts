import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/**
 * Password attempts (login and signup share them, both can try a password on
 * an existing account).
 * - Per email, 5 in 15 min: a real person who forgot their password tries a
 *   few times then resets it; a guesser is capped at 20 tries an hour.
 * - Per IP, 30 in 15 min: one script cannot sweep many accounts, while a
 *   shared mobile-carrier or school IP (many real people behind one address)
 *   still has room.
 */
export const AUTH_ATTEMPT_LIMITS = {
  email: { limit: 5, windowMs: FIFTEEN_MINUTES },
  ip: { limit: 30, windowMs: FIFTEEN_MINUTES },
} as const;

export type AuthAttemptResult = { ok: true } | { ok: false; error: string };

function emailKey(email: string) {
  return `auth-attempt:email:${email.trim().toLowerCase()}`;
}

export function tooManyAttemptsMessage(retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Trop d'essais. Réessaie dans ${minutes} minute${minutes > 1 ? "s" : ""}, ou réinitialise ton mot de passe.`;
}

/**
 * Counts one password attempt for this email and this IP, before Supabase is
 * called. An unknown IP (no Vercel header, e.g. local dev) is not counted, so
 * it never becomes one bucket shared by everybody.
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
  if (ip && ip !== "unknown") {
    const byIp = rateLimit(
      `auth-attempt:ip:${ip}`,
      AUTH_ATTEMPT_LIMITS.ip.limit,
      AUTH_ATTEMPT_LIMITS.ip.windowMs,
      now
    );
    if (!byIp.ok) return { ok: false, error: tooManyAttemptsMessage(byIp.retryAfterSeconds) };
  }

  const byEmail = rateLimit(
    emailKey(email),
    AUTH_ATTEMPT_LIMITS.email.limit,
    AUTH_ATTEMPT_LIMITS.email.windowMs,
    now
  );
  if (!byEmail.ok) return { ok: false, error: tooManyAttemptsMessage(byEmail.retryAfterSeconds) };

  return { ok: true };
}

/** The right password was given: the email starts again from zero. */
export function clearAuthAttempts(email: string) {
  resetRateLimit(emailKey(email));
}
