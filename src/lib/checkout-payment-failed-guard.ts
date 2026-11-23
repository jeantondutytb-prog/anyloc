import { NextResponse } from "next/server";
import {
  getPaymentFailedCheckoutBlockWith,
  PAYMENT_FAILED_CHECKOUT_CODE,
  PAYMENT_FAILED_CHECKOUT_ERROR,
  type PaymentFailedCheckoutBlock,
  UPDATE_CARD_PATH,
} from "@/lib/checkout-payment-failed-guard-core";
import { logError } from "@/lib/log-error";
import { stripe } from "@/lib/stripe";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export { isPaymentFailedStatus, PAYMENT_FAILED_STATUSES } from "@/lib/checkout-payment-failed-guard-core";

/**
 * Server wrapper of the guard, wired to the real profile and the real Stripe
 * subscription. Never rejects, so it can start early and be awaited later.
 */
export function getPaymentFailedCheckoutBlock(
  userId: string | null | undefined
): Promise<PaymentFailedCheckoutBlock> {
  return getPaymentFailedCheckoutBlockWith(userId, {
    getProfile: async (id) => {
      if (!isSupabaseAdminConfigured()) {
        return null;
      }
      try {
        const { data, error } = await createAdminClient()
          .from("profiles")
          .select("subscription_status, stripe_subscription_id")
          .eq("id", id)
          .maybeSingle();
        if (error) {
          throw error;
        }
        return data;
      } catch (error) {
        // A database hiccup must not stop every sale: let the checkout go on.
        await logError("checkout-guard/profile", error, { userId: id });
        return null;
      }
    },
    getStripeSubscriptionStatus: async (subscriptionId) => {
      if (!stripe) {
        throw new Error("Stripe not configured");
      }
      try {
        return (await stripe.subscriptions.retrieve(subscriptionId)).status;
      } catch (error) {
        await logError("checkout-guard/subscription", error, {
          userId,
          stripe_subscription_id: subscriptionId,
        });
        throw error;
      }
    },
  });
}

/** The API answer when the guard refuses: no session, a clear message and where to go. */
export function paymentFailedCheckoutResponse() {
  return NextResponse.json(
    {
      error: PAYMENT_FAILED_CHECKOUT_ERROR,
      code: PAYMENT_FAILED_CHECKOUT_CODE,
      redirectTo: UPDATE_CARD_PATH,
    },
    { status: 409 }
  );
}
