import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export async function verifyCheckoutSessionForUser(
  sessionId: string,
  userId: string,
  userEmail?: string | null
) {
  if (!stripe) {
    return { verified: false as const, error: "Stripe non configuré." };
  }

  if (!sessionId.startsWith("cs_")) {
    return { verified: false as const, error: "Session invalide." };
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  return evaluateCheckoutSession(session, userId, userEmail);
}

/** Pure part of the check: does this session belong to the user, and is it paid? */
export function evaluateCheckoutSession(
  session: Pick<
    Stripe.Checkout.Session,
    "client_reference_id" | "metadata" | "customer_details" | "customer_email" | "status" | "payment_status" | "mode"
  >,
  userId: string,
  userEmail?: string | null
) {
  const sessionUserId =
    session.client_reference_id ?? session.metadata?.supabase_user_id;

  const sessionEmail =
    session.customer_details?.email?.trim().toLowerCase() ??
    session.customer_email?.trim().toLowerCase() ??
    null;

  const emailMatches =
    Boolean(userEmail) &&
    Boolean(sessionEmail) &&
    userEmail!.trim().toLowerCase() === sessionEmail;

  if (!sessionUserId && !emailMatches) {
    return { verified: false as const, error: "Session non autorisée." };
  }

  if (sessionUserId && sessionUserId !== userId && !emailMatches) {
    return { verified: false as const, error: "Session non autorisée." };
  }

  // A SEPA checkout is "complete" before the money arrives: only a paid (or
  // free / card-setup) session counts.
  const isPaid =
    session.status === "complete" &&
    (session.payment_status === "paid" ||
      session.payment_status === "no_payment_required" ||
      session.mode === "setup");

  if (!isPaid) {
    return { verified: false as const, error: "Paiement non confirmé." };
  }

  return {
    verified: true as const,
    planId: session.metadata?.plan_id ?? null,
  };
}
