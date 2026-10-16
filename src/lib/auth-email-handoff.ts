/**
 * Carries the email typed on /signup over to /login when the account already
 * exists, so the visitor only has to type their password. Kept in
 * sessionStorage (never in the URL); storage can be blocked, so failures are
 * silent and the login form simply starts empty.
 */
const KEY = "anyloc:auth-email";

export function stashAuthEmail(email: string) {
  try {
    if (email) window.sessionStorage.setItem(KEY, email);
  } catch {}
}

export function takeAuthEmail(): string | null {
  try {
    const email = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    return email;
  } catch {
    return null;
  }
}
