// Auto-sync polls Supabase with the user's access token. When that token is
// dead (expired and its refresh token already used or revoked), polling every
// second forever only piles up 401s while the app looks fine to the user.
// These two helpers decide the next poll delay and what a 401 leads to; the
// Electron side (main.js) stays a thin caller, so they are tested on Node.

/** First delay after a failure; a success brings the poll back to it. */
const MIN_POLL_DELAY_MS = 1000;
/** Ceiling of the backoff: one poll every 30 s while it keeps failing. */
const MAX_POLL_DELAY_MS = 30000;

/** 0 failures → 1 s, then 2, 4, 8, 16, capped at 30 s. */
function nextPollDelay(failures) {
  const n = Math.max(0, Math.floor(Number(failures) || 0));
  return Math.min(MAX_POLL_DELAY_MS, MIN_POLL_DELAY_MS * 2 ** Math.min(n, 30));
}

/**
 * What a 401 from the poll leads to. One immediate renewal per run of 401s:
 *   - renewal works → "renewed" with the fresh session, polling goes on;
 *   - renewal fails, throws, or the poll answers 401 again right after a
 *     renewal → "expired": stop the loop, log out, ask to log in again.
 * A successful poll (`onSuccess`) re-arms the renewal for a later expiry.
 */
function createSessionGuard({ refresh }) {
  let renewedSinceLastSuccess = false;

  return {
    async onUnauthorized(session) {
      if (renewedSinceLastSuccess) return { action: "expired" };
      renewedSinceLastSuccess = true;
      let fresh = null;
      try {
        fresh = await refresh(session);
      } catch {
        fresh = null;
      }
      return fresh?.access_token ? { action: "renewed", session: fresh } : { action: "expired" };
    },
    onSuccess() {
      renewedSinceLastSuccess = false;
    },
  };
}

/** Shown on the login screen after a session the app could not renew. */
const SESSION_EXPIRED_MESSAGE = "Ta session a expiré. Reconnecte-toi à ton compte Anyloc.";

module.exports = {
  MIN_POLL_DELAY_MS,
  MAX_POLL_DELAY_MS,
  SESSION_EXPIRED_MESSAGE,
  createSessionGuard,
  nextPollDelay,
};
