import type { User } from "@supabase/supabase-js";
import {
  capturePostHogEvent,
  identifyPostHogUser,
} from "@/lib/posthog/server";

/**
 * Supabase stamps created_at, Vercel stamps the OAuth start: two clocks.
 * The account is created at the end of the Google round trip, and a second
 * round trip can't start until the person lands back on a page and clicks
 * again (well over this margin), so a small tolerance is safe both ways.
 */
const CLOCK_SKEW_MS = 2_000;

type GoogleSignupUser = Pick<User, "id" | "email" | "created_at" | "app_metadata">;

/**
 * True only for an account Google created during this OAuth round trip.
 * A returning Google user, an email account that links Google, or a missing
 * start stamp (no round trip started by /auth/google) all return false.
 */
export function isNewGoogleSignup(
  user: GoogleSignupUser,
  oauthStartedAt: number | null
): boolean {
  if (oauthStartedAt === null) {
    return false;
  }

  if (user.app_metadata?.provider !== "google") {
    return false;
  }

  const createdAt = Date.parse(user.created_at);

  if (!Number.isFinite(createdAt)) {
    return false;
  }

  return createdAt >= oauthStartedAt - CLOCK_SKEW_MS;
}

type PostHogCalls = {
  identify: typeof identifyPostHogUser;
  capture: typeof capturePostHogEvent;
};

/**
 * Same person id and properties as the email signup (src/app/auth/actions.ts),
 * plus method: "google". Sends nothing for a returning Google user.
 */
export async function trackGoogleSignup(
  user: GoogleSignupUser,
  oauthStartedAt: number | null,
  posthog: PostHogCalls = {
    identify: identifyPostHogUser,
    capture: capturePostHogEvent,
  }
): Promise<boolean> {
  if (!isNewGoogleSignup(user, oauthStartedAt)) {
    return false;
  }

  await posthog.identify({
    distinctId: user.id,
    properties: { email: user.email },
  });
  await posthog.capture({
    distinctId: user.id,
    event: "signup_completed",
    properties: { method: "google" },
  });

  return true;
}
