"use client";

import { useMemo } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { getStripePublishableKey } from "@/lib/stripe-client";

export function StripeEmbeddedCheckout({
  clientSecret,
}: {
  clientSecret: string;
}) {
  const publishableKey = getStripePublishableKey();
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
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
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ clientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
