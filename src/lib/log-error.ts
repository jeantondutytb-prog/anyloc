import { capturePostHogException } from "@/lib/posthog/server";

export type LogErrorContext = {
  /** Supabase user id: the error then shows up on that person in PostHog. */
  userId?: string | null;
  [key: string]: unknown;
};

/**
 * Supabase and Stripe hand back plain objects ({ message, code, details }),
 * which `String()` would turn into "[object Object]" in PostHog.
 */
export function normalizeError(error: unknown): {
  error: Error;
  details: Record<string, unknown>;
} {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    const details: Record<string, unknown> = code === undefined ? {} : { error_code: code };

    // A friendly message thrown for the user keeps the real failure as its cause.
    if (error.cause !== undefined) {
      const cause = normalizeError(error.cause);
      details.error_cause = cause.error.message;
      for (const [key, value] of Object.entries(cause.details)) {
        details[`cause_${key}`] = value;
      }
    }

    return { error, details };
  }

  if (typeof error === "object" && error !== null) {
    const { message, code, details, hint } = error as Record<string, unknown>;
    const normalized = new Error(
      typeof message === "string" && message ? message : JSON.stringify(error)
    );
    return {
      error: normalized,
      details: Object.fromEntries(
        Object.entries({ error_code: code, error_details: details, error_hint: hint }).filter(
          ([, value]) => value !== undefined && value !== null && value !== ""
        )
      ),
    };
  }

  return { error: new Error(String(error)), details: {} };
}

/**
 * Server-side error log: prints to the Vercel logs and records the exception in
 * PostHog, attached to the user when known, so a support request can be traced
 * from that person's PostHog profile. Never pass PII (email, password, address,
 * coordinates) in the context.
 */
export async function logError(
  scope: string,
  error: unknown,
  context: LogErrorContext = {}
) {
  const { userId, ...properties } = context;
  const normalized = normalizeError(error);

  console.error(`[${scope}]`, ...(userId ? [`user=${userId}`] : []), error);

  try {
    await capturePostHogException({
      distinctId: userId || "server",
      error: normalized.error,
      properties: { scope, ...normalized.details, ...properties },
    });
  } catch (reportError) {
    console.error("[log-error] Failed to report to PostHog", reportError);
  }
}
