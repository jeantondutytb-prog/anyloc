"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/checkout/stripe-embedded-checkout";
import { Button } from "@/components/ui/button";

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  if (!text) {
    throw new Error("Réponse serveur vide. Réessaie dans quelques instants.");
  }

  try {
    return JSON.parse(text) as { clientSecret?: string; error?: string };
  } catch {
    throw new Error("Réponse serveur invalide. Réessaie dans quelques instants.");
  }
}

export function OnboardingPaywallStripe({
  planId,
  stripePublishableKey,
}: {
  planId: string;
  stripePublishableKey: string;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  async function startCheckout(nextPlanId: string, isInitial = false) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    if (isInitial) {
      setLoading(true);
    } else {
      setUpdating(true);
    }

    setError(null);
    setNeedsAuth(false);

    try {
      const res = await fetch("/api/stripe/embedded-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: nextPlanId }),
        signal: controller.signal,
      });
      const data = await parseJsonResponse(res);

      if (res.status === 401) {
        setClientSecret(null);
        setNeedsAuth(true);
        return;
      }

      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error ?? "Impossible de démarrer le paiement.");
      }

      if (requestRef.current === controller) {
        setClientSecret(data.clientSecret);
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }

      setClientSecret(null);
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue. Réessaie dans quelques instants."
      );
    } finally {
      if (requestRef.current === controller) {
        setLoading(false);
        setUpdating(false);
      }
    }
  }

  useEffect(() => {
    void startCheckout(planId, true);
    return () => requestRef.current?.abort();
  }, [planId]);

  const loginNext = encodeURIComponent("/onboarding?step=3");
  const signupHref = `/signup?plan=${planId}`;

  return (
    <div className="relative mt-8">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-900">
        <CreditCard className="h-4 w-4 text-pink-600" />
        Paiement sécurisé
      </div>

      {needsAuth && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-center">
          <p className="text-sm font-medium text-zinc-900">
            Connecte-toi pour finaliser ton paiement
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Ton plan et ta destination sont déjà sélectionnés.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href={`/login?next=${loginNext}`}>
              <Button className="w-full sm:w-auto">Se connecter</Button>
            </Link>
            <Link href={signupHref}>
              <Button variant="secondary" className="w-full sm:w-auto">
                Créer un compte
              </Button>
            </Link>
          </div>
        </div>
      )}

      {error && !needsAuth && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {!needsAuth && (
        <>
          {loading && !clientSecret ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-zinc-200 bg-white">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Préparation du checkout Stripe…
              </div>
            </div>
          ) : clientSecret ? (
            <div className="relative">
              {updating ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mise à jour de la formule…
                  </div>
                </div>
              ) : null}
              <StripeEmbeddedCheckout
                key={clientSecret}
                clientSecret={clientSecret}
                publishableKey={stripePublishableKey}
              />
            </div>
          ) : null}
        </>
      )}

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
        <Lock className="h-3.5 w-3.5 text-emerald-600" />
        SSL · chiffrement 256 bits · Stripe
      </div>
    </div>
  );
}
