import type Stripe from "stripe";
import { PLANS, type Plan } from "@/lib/constants";
import { stripe } from "@/lib/stripe";

export type VerifiedCheckoutSession = {
  sessionId: string;
  plan: Plan | null;
  customerEmail: string | null;
};

function getPlanFromSession(session: Stripe.Checkout.Session): Plan | null {
  const planId = session.metadata?.plan_id;
  if (!planId) {
    return null;
  }

  return PLANS.find((plan) => plan.id === planId) ?? null;
}

export async function getVerifiedCheckoutSession({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}): Promise<VerifiedCheckoutSession | null> {
  if (!stripe || !sessionId) {
    return null;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const sessionUserId =
      session.client_reference_id ?? session.metadata?.supabase_user_id;

    if (sessionUserId !== userId) {
      return null;
    }

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return null;
    }

    return {
      sessionId: session.id,
      plan: getPlanFromSession(session),
      customerEmail:
        session.customer_details?.email ?? session.customer_email ?? null,
    };
  } catch (error) {
    console.error("[checkout-session] Failed to verify session:", error);
    return null;
  }
}
