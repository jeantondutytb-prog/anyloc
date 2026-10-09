"use client";

import { useEffect, useMemo, useRef } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe, type StripeEmbeddedCheckoutAnalyticsEventUnion } from "@stripe/stripe-js";

export function StripeEmbeddedCheckout({
  clientSecret,
  publishableKey,
  onSubmitFailed,
}: {
  clientSecret: string;
  publishableKey: string;
  /** The customer hit "Payer" and the payment didn't go through (e.g. card declined). */
  onSubmitFailed?: () => void;
}) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  // Stripe ignores option changes after mount: keep the latest callback in a ref.
  const onSubmitFailedRef = useRef(onSubmitFailed);
  useEffect(() => {
    onSubmitFailedRef.current = onSubmitFailed;
  }, [onSubmitFailed]);

  const options = useMemo(
    () => ({
      clientSecret,
      onAnalyticsEvent: (event: StripeEmbeddedCheckoutAnalyticsEventUnion) => {
        if (event.eventType !== "checkoutSubmitFailed") return;
        if (event.details.failureReason !== "user_cancelled") {
          onSubmitFailedRef.current?.();
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
