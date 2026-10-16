"use client";

import { useEffect, useMemo, useRef } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe, type StripeEmbeddedCheckoutAnalyticsEventUnion } from "@stripe/stripe-js";

export function StripeEmbeddedCheckout({
  clientSecret,
  publishableKey,
  onRendered,
  onSubmitted,
  onSubmitFailed,
}: {
  clientSecret: string;
  publishableKey: string;
  /** Stripe has actually drawn its payment form on screen. */
  onRendered?: () => void;
  /** The customer hit "Payer", whatever the outcome. */
  onSubmitted?: (paymentMethodType: string) => void;
  /** The customer hit "Payer" and the payment didn't go through (e.g. card declined). */
  onSubmitFailed?: () => void;
}) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  // Stripe ignores option changes after mount: keep the latest callbacks in a ref.
  const callbacksRef = useRef({ onRendered, onSubmitted, onSubmitFailed });
  useEffect(() => {
    callbacksRef.current = { onRendered, onSubmitted, onSubmitFailed };
  }, [onRendered, onSubmitted, onSubmitFailed]);

  const options = useMemo(
    () => ({
      clientSecret,
      onAnalyticsEvent: (event: StripeEmbeddedCheckoutAnalyticsEventUnion) => {
        const callbacks = callbacksRef.current;
        if (event.eventType === "checkoutRendered") {
          callbacks.onRendered?.();
        } else if (event.eventType === "checkoutSubmitted") {
          callbacks.onSubmitted?.(event.details.paymentMethodType);
        } else if (
          event.eventType === "checkoutSubmitFailed" &&
          event.details.failureReason !== "user_cancelled"
        ) {
          callbacks.onSubmitFailed?.();
        }
      },
    }),
    [clientSecret]
  );

  if (!publishableKey) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Le paiement n&apos;est pas configuré (clé publique Stripe manquante).
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
