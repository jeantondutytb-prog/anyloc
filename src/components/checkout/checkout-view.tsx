"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  CreditCard,
  Lock,
  MapPin,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS, SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Plan = (typeof PLANS)[number];

export function CheckoutView({
  initialPlanId,
  canceled,
}: {
  initialPlanId: string;
  canceled?: boolean;
}) {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) ?? PLANS[2];

  function selectPlan(planId: string) {
    setSelectedPlanId(planId);
    setError(null);
    router.replace(`/checkout?plan=${planId}`, { scroll: false });
  }

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(
          "Le paiement n'est pas encore configuré. Contacte le support ou réessaie plus tard."
        );
      }
    } catch {
      setError("Une erreur est survenue. Réessaie dans quelques instants.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-[45%] overflow-hidden lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-violet-500/10 to-orange-400/10" />
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute -right-10 bottom-32 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 shadow-sm backdrop-blur">
              <MapPin className="h-4 w-4 text-pink-600" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-zinc-900">
              {SITE.name}
            </span>
          </Link>

          <div className="my-auto max-w-md">
            <Badge className="mb-6 border-pink-300/50 bg-white/70 text-pink-700 backdrop-blur">
              <Sparkles className="mr-1 h-3 w-3" />
              3 jours offerts
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 xl:text-4xl">
              Presque prêt à{" "}
              <span className="gradient-text">changer de life</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600">
              Choisis ton plan, active ton essai gratuit et commence à piloter
              ta loc sur toutes tes apps — Snap, Insta, Tinder, jeux, tout.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Annulation en 1 clic, sans engagement",
                "Paiement sécurisé par Stripe",
                "Accès immédiat après validation",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2.5 text-sm text-zinc-700"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-500/15">
                    <Check className="h-3 w-3 text-pink-600" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-zinc-500">
            Des milliers d&apos;utilisateurs changent déjà de ville chaque jour.
          </p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4 sm:px-8 lg:border-none">
          <Link
            href="/"
            className="text-sm text-zinc-500 transition hover:text-zinc-900 lg:hidden"
          >
            ← Retour
          </Link>
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/30 to-violet-500/30">
              <MapPin className="h-4 w-4 text-pink-600" />
            </div>
            <span className="font-semibold">{SITE.name}</span>
          </Link>
          <div className="hidden lg:block" />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-lg">
            <div className="mb-8 flex items-center gap-2 text-sm">
              <Step done label="Compte" />
              <div className="h-px flex-1 bg-pink-300/50" />
              <Step active label="Paiement" />
              <div className="h-px flex-1 bg-zinc-200" />
              <Step label="Accès" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Finalise ton abonnement
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Sélectionne ton plan — tu ne seras facturé qu&apos;après les 3
              jours d&apos;essai.
            </p>

            {canceled && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Paiement annulé. Tu peux réessayer quand tu veux.
              </p>
            )}

            <div className="mt-6 grid grid-cols-3 gap-2">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => selectPlan(plan.id)}
                  className={cn(
                    "relative rounded-xl border px-3 py-3 text-center transition-all",
                    selectedPlanId === plan.id
                      ? "border-pink-500/50 bg-gradient-to-b from-pink-500/10 to-violet-500/5 ring-1 ring-pink-500/25"
                      : "border-zinc-200 bg-white hover:border-pink-300/50"
                  )}
                >
                  {plan.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-medium text-white">
                      Populaire
                    </span>
                  )}
                  <span className="block text-xs font-medium text-zinc-500">
                    {plan.name}
                  </span>
                  <span className="mt-1 block text-sm font-bold text-zinc-900">
                    {plan.price}
                  </span>
                </button>
              ))}
            </div>

            <Card className="mt-6 overflow-hidden">
              <div className="border-b border-zinc-100 bg-gradient-to-r from-pink-50/80 to-violet-50/50 px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-zinc-900">
                      {selectedPlan.name}
                    </h2>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      {selectedPlan.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-zinc-900">
                      {selectedPlan.price}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {selectedPlan.period}
                    </span>
                  </div>
                </div>
                {selectedPlan.savings && (
                  <p className="mt-2 text-sm font-medium text-pink-600">
                    {selectedPlan.savings}
                  </p>
                )}
              </div>

              <ul className="space-y-3 px-6 py-5">
                {selectedPlan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-zinc-600"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600">Essai gratuit</span>
                  <span className="font-medium text-emerald-600">
                    3 jours — 0€
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-zinc-600">
                    Après l&apos;essai
                  </span>
                  <span className="font-semibold text-zinc-900">
                    {selectedPlan.price}
                    {selectedPlan.period}
                  </span>
                </div>
              </div>
            </Card>

            {error && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <Button
              className="mt-6 w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                "Redirection vers le paiement..."
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Activer mon essai gratuit
                </>
              )}
            </Button>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" />
                Paiement sécurisé
              </span>
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" />
                Annulation facile
              </span>
            </div>

            <p className="mt-6 text-center text-xs leading-relaxed text-zinc-500">
              En continuant, tu acceptes nos conditions d&apos;utilisation. Tu
              peux annuler à tout moment depuis ton espace client. Aucun
              prélèvement pendant les 3 jours d&apos;essai.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Step({
  label,
  done,
  active,
}: {
  label: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
          done
            ? "bg-pink-500 text-white"
            : active
              ? "bg-pink-500/15 text-pink-600 ring-1 ring-pink-500/30"
              : "bg-zinc-100 text-zinc-400"
        )}
      >
        {done ? <Check className="h-3 w-3" /> : active ? "2" : "3"}
      </div>
      <span
        className={cn(
          "hidden text-xs sm:inline",
          done || active ? "font-medium text-zinc-900" : "text-zinc-400"
        )}
      >
        {label}
      </span>
    </div>
  );
}
