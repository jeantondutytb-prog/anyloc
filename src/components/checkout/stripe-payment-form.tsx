"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2, Lock } from "lucide-react";
import { stripeAppearance } from "@/lib/stripe-appearance";

function PaymentForm({ returnUrl }: { returnUrl: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    if (submitError) {
      setError(
        submitError.message ?? "Le paiement a échoué. Réessaie dans quelques instants."
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      {!ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des moyens de paiement…
          </div>
        </div>
      ) : null}

      <PaymentElement
        options={{ layout: "tabs" }}
        onReady={() => setReady(true)}
        onLoadError={(loadError) => {
          setError(
            loadError.error.message ??
              "Impossible de charger le formulaire de paiement."
          );
        }}
      />

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!stripe || !elements || !ready || submitting}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 btn-gradient"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Validation en cours…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Valider et payer
          </>
        )}
      </button>
    </form>
  );
}

export function StripePaymentForm({
  clientSecret,
  publishableKey,
  returnUrl,
}: {
  clientSecret: string;
  publishableKey: string;
  returnUrl: string;
}) {
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
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: stripeAppearance,
        }}
      >
        <PaymentForm returnUrl={returnUrl} />
      </Elements>
    </div>
  );
}
