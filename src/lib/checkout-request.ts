import { track } from "@/lib/analytics/track";
import { getPostHogDistinctId } from "@/lib/posthog/browser";

/** Backoff between attempts when the request never reaches the server. */
const NETWORK_RETRY_DELAYS_MS = [800, 2000];

/**
 * fetch rejects with a TypeError when the network drops the request
 * ("Load failed" on Safari iOS, "Failed to fetch" on Chrome): worth retrying.
 */
export function isNetworkError(err: unknown) {
  return err instanceof TypeError;
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  if (!text) {
    throw new Error("Réponse serveur vide. Réessaie dans quelques instants.");
  }

  try {
    return JSON.parse(text) as { clientSecret?: string; url?: string; error?: string };
  } catch {
    throw new Error("Réponse serveur invalide. Réessaie dans quelques instants.");
  }
}

/**
 * Creates a Stripe checkout session for `planId`: `/api/stripe/embedded-checkout`
 * answers a client secret (payment popup), `/api/checkout` a hosted page URL.
 * Retries when the network drops the request; `networkRetries` is reported
 * for analytics.
 */
export async function requestCheckoutSession(
  endpoint: "/api/stripe/embedded-checkout" | "/api/checkout",
  planId: string,
  signal: AbortSignal
) {
  let attempt = 0;

  for (;;) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Lets the webhook tie a purchase made without an account to this visit.
        body: JSON.stringify({ planId, analyticsId: getPostHogDistinctId() }),
        signal,
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Impossible de démarrer le paiement.");
      }
      return { ...data, networkRetries: attempt };
    } catch (err) {
      const delay = NETWORK_RETRY_DELAYS_MS[attempt];
      if (signal.aborted || !isNetworkError(err) || delay === undefined) {
        throw err;
      }
      attempt += 1;
      track("checkout_network_retry", {
        plan: planId,
        attempt,
        error: err instanceof Error ? err.message : String(err),
      });
      await wait(delay, signal);
      if (signal.aborted) throw err;
    }
  }
}
