/** An error whose message is written for the customer and safe to show them. */
export class UserFacingError extends Error {}

/** The message to send back to the browser: never a raw Stripe/Supabase error. */
export function publicErrorMessage(error: unknown, fallback: string) {
  return error instanceof UserFacingError ? error.message : fallback;
}
