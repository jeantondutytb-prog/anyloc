import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * "This browser already logged into this account": a signed cookie set after
 * a correct password, read before the next attempt. It survives new server
 * instances (unlike memory) and cannot be forged without CRON_SECRET (also
 * used to sign unsubscribe links; the "auth-trusted-device" prefix keeps the
 * two signatures apart). The cookie holds no email, only an expiry and a
 * signature over email + expiry.
 */
export const TRUSTED_DEVICE_COOKIE = "anyloc-auth-device";
export const TRUSTED_DEVICE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function sign(secret: string, email: string, expiresAt: number) {
  return createHmac("sha256", secret)
    .update(`auth-trusted-device|${email.trim().toLowerCase()}|${expiresAt}`)
    .digest("base64url");
}

export function createTrustedDeviceToken(secret: string, email: string, now = Date.now()) {
  const expiresAt = now + TRUSTED_DEVICE_MAX_AGE_SECONDS * 1000;
  return `${expiresAt}.${sign(secret, email, expiresAt)}`;
}

export function isTrustedDeviceToken(
  secret: string,
  email: string,
  token: string | undefined,
  now = Date.now()
) {
  if (!token) return false;
  const [rawExpiry, signature] = token.split(".");
  const expiresAt = Number(rawExpiry);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt <= now) return false;

  const expected = Buffer.from(sign(secret, email, expiresAt));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Null when no secret is set: trusted devices are then simply off. */
export function getTrustedDeviceSecret() {
  return process.env.CRON_SECRET || null;
}
