import { ipBucket } from "@/lib/auth-attempt-limit";
import { rateLimit } from "@/lib/rate-limit";

/**
 * "Mot de passe oublié": the link is a Supabase recovery token generated on
 * the server (admin generateLink) and sent with Resend, like the other
 * account emails. Clicking it only stores the token in a short-lived httpOnly
 * cookie (a mail scanner opening the link spends nothing, and the token never
 * sits in the address bar or in analytics); the token is spent when the new
 * password is submitted.
 */

export const RESET_TOKEN_COOKIE = "anyloc-reset-token";

/** Same as Supabase's default email link lifetime. */
export const RESET_TOKEN_MAX_AGE_SECONDS = 60 * 60;

const ONE_HOUR = 60 * 60 * 1000;

/**
 * Per email: 3 an hour, so nobody can flood an inbox. Per IP: 10 an hour, so
 * one script can't walk through many addresses. In memory, best effort, like
 * the login limit.
 */
export const PASSWORD_RESET_LIMITS = {
  email: { limit: 3, windowMs: ONE_HOUR },
  ip: { limit: 10, windowMs: ONE_HOUR },
} as const;

/** Same message whether or not an account exists: it reveals nothing. */
export const PASSWORD_RESET_SENT_NOTICE =
  "Si un compte existe avec cette adresse, on vient de t'envoyer un lien pour choisir un nouveau mot de passe. Pense à regarder dans les spams.";

export const PASSWORD_RESET_EXPIRED_ERROR =
  "Ce lien a expiré ou a déjà servi. Redemande un lien depuis « Mot de passe oublié ».";

export const PASSWORD_RESET_OTHER_ACCOUNT_ERROR =
  "Ce lien concerne un autre compte que celui connecté ici. Déconnecte-toi, puis redemande un lien depuis « Mot de passe oublié ».";

/**
 * A reset link may only log this browser into its account when nobody is
 * logged in here, or when it's the same account.
 */
export function isResetForCurrentBrowser(currentUserId: string | null, linkUserId: string) {
  return currentUserId === null || currentUserId === linkUserId;
}

export function normalizeResetEmail(email: string) {
  return email.trim().toLowerCase();
}

/** True when this request may send an email. Unknown IP: only the per-email cap. */
export function allowPasswordResetRequest({
  email,
  ip,
  now = Date.now(),
}: {
  email: string;
  ip: string;
  now?: number;
}) {
  if (ip && ip !== "unknown") {
    const { limit, windowMs } = PASSWORD_RESET_LIMITS.ip;
    if (!rateLimit(`password-reset:ip:${ipBucket(ip)}`, limit, windowMs, now).ok) return false;
  }
  const { limit, windowMs } = PASSWORD_RESET_LIMITS.email;
  return rateLimit(`password-reset:email:${normalizeResetEmail(email)}`, limit, windowMs, now).ok;
}

/** The link in the email: our route, which keeps the token in a cookie. */
export function buildPasswordResetLink(appUrl: string, tokenHash: string) {
  const url = new URL("/auth/reset-password", appUrl);
  url.searchParams.set("token_hash", tokenHash);
  return url.toString();
}

/** A recovery token hash as Supabase issues it (hex); anything else is ignored. */
export function isPlausibleTokenHash(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{20,200}$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPasswordResetEmail(link: string) {
  const subject = "Ton lien pour changer ton mot de passe Anyloc";
  const lines = [
    "Salut,",
    "Tu as demandé à changer ton mot de passe Anyloc. Clique sur ce lien pour en choisir un nouveau :",
    link,
    "Le lien marche pendant 1 heure, une seule fois.",
    "Si ce n'est pas toi, ignore ce mail : ton mot de passe ne change pas.",
    "Jean d'Anyloc",
  ];
  const safeLink = escapeHtml(link);
  const html = [
    "<p>Salut,</p>",
    "<p>Tu as demandé à changer ton mot de passe Anyloc. Clique sur ce lien pour en choisir un nouveau :</p>",
    `<p><a href="${safeLink}">Choisir un nouveau mot de passe</a></p>`,
    "<p>Le lien marche pendant 1 heure, une seule fois.</p>",
    "<p>Si ce n'est pas toi, ignore ce mail : ton mot de passe ne change pas.</p>",
    "<p>Jean d'Anyloc</p>",
  ].join("");
  return { subject, text: lines.join("\n\n"), html };
}
