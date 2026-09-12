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

  if (sessionUserId && sessionUserId !== userId && !emailMatches) {
    return { verified: false as const, error: "Session non autorisée." };
  }

  if (session.payment_status !== "paid" && session.status !== "complete") {
    return { verified: false as const, error: "Paiement non confirmé." };
  }

  return {
    verified: true as const,
    planId: session.metadata?.plan_id ?? null,
  };
}
