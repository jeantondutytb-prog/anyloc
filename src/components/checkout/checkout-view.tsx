"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Download,
  Loader2,
  Lock,
  MapPin,
  Shield,
} from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { StripeEmbeddedCheckout } from "@/components/checkout/stripe-embedded-checkout";
import { PlanPrice } from "@/components/pricing/plan-price";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import {
  CHECKOUT_PERKS,
  DESTINATIONS,
  FAQ,
  PLANS,
  SITE,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const SETUP_STEPS = [
  {
    icon: CreditCard,
    title: "Valide ta formule",
    description: "Paiement sécurisé — ton accès Anyloc est prêt en quelques secondes.",
  },
  {
    icon: Download,
    title: "Configure ton tel",
    description:
      "Android : tout depuis le mobile. iPhone : branchement unique à un ordi, puis c'est bon.",
  },
  {
    icon: MapPin,
    title: "Choisis ta destination",
    description:
      "Un spot sur la map, un signal activé — toutes tes apps basculent au même endroit.",
  },
] as const;

const SIDEBAR_FAQ = FAQ.slice(0, 2);

const TRUST_ITEMS = [
  "Paiement chiffré via Stripe",
  "Accès instantané après validation",
  "Résiliation en 1 clic",
];

export function CheckoutView({
  initialPlanId,
  canceled,
  stripePublishableKey,
}: {
  initialPlanId: string;
  canceled?: boolean;
  stripePublishableKey: string;
}) {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const selectedPlan =
    PLANS.find((plan) => plan.id === selectedPlanId) ?? PLANS[2];

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

  async function startCheckout(planId: string, isInitial = false) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    if (isInitial) {
      setLoading(true);
    } else {
      setUpdating(true);
    }
    setError(null);

    try {
      const res = await fetch("/api/stripe/embedded-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
        signal: controller.signal,
      });
      const data = await parseJsonResponse(res);

      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error ?? "Impossible de démarrer le paiement.");
      }

      if (requestRef.current === controller) {
        setClientSecret(data.clientSecret);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
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

  function selectPlan(planId: string) {
    if (planId === selectedPlanId) return;
    setSelectedPlanId(planId);
    setClientSecret(null);
    setError(null);
    router.replace(`/checkout?plan=${planId}`, { scroll: false });
    void startCheckout(planId);
  }

  useEffect(() => {
    void startCheckout(initialPlanId, true);
    return () => requestRef.current?.abort();
  }, [initialPlanId]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-pink-500/8 blur-[120px]" />
        <div className="absolute top-32 right-0 h-[280px] w-[360px] rounded-full bg-violet-500/8 blur-[100px]" />
      </div>

      <header className="relative z-20 border-b border-zinc-200 bg-logo-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Logo nameClassName="text-base font-bold tracking-tight sm:text-lg" />
          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-6 sm:flex">
              <Link
                href="/#features"
                className="text-sm text-zinc-600 transition hover:text-zinc-900"
              >
                Fonctionnalités
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-zinc-600 transition hover:text-zinc-900"
              >
                Tarifs
              </Link>
            </nav>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Accueil
            </Link>
          </div>
        </div>
      </header>

      <main className="relative flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12 xl:gap-16">
            <aside className="hidden lg:flex lg:min-h-full lg:flex-col lg:rounded-2xl lg:border lg:border-zinc-200 lg:bg-white/80 lg:p-6 lg:backdrop-blur-sm">
              <Badge className="mb-5">GPS spoofé · toutes tes apps</Badge>

                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                  Fake ta loc.
                  <br />
                  <span className="gradient-text">{SITE.tagline}</span>
                </h1>

                <p className="mt-4 text-sm leading-relaxed text-zinc-600 sm:text-base">
                  {SITE.description} Ton accès {SITE.name} s&apos;active dès la
                  validation — pas de screenshot, pas de montage : un vrai signal
                  GPS.
                </p>

                <ul className="mt-8 space-y-3">
                  {CHECKOUT_PERKS.map((perk) => (
                    <li
                      key={perk}
                      className="flex items-start gap-2.5 text-sm text-zinc-700"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" />
                      {perk}
                    </li>
                  ))}
                </ul>

                <Card className="mt-8 border-pink-500/15 bg-gradient-to-b from-pink-500/5 to-transparent p-4">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-pink-500 animate-pulse" />
                      <span className="text-xs text-zinc-600">Signal GPS actif</span>
                    </div>
                    <span className="text-xs font-medium text-pink-600">
                      📍 Marbella
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                    Toi t&apos;es chez toi. Sur la map t&apos;es à Marbella. Même
                    coords, même instant — comme sur la{" "}
                    <Link href="/" className="text-pink-600 hover:underline">
                      page d&apos;accueil
                    </Link>
                    .
                  </p>
                </Card>

              <div className="mt-8 space-y-8 border-t border-zinc-200 pt-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">
                    Opérationnel en quelques minutes
                  </p>
                  <div className="mt-4 space-y-4">
                    {SETUP_STEPS.map((step, index) => (
                      <div key={step.title} className="flex gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-pink-500/20 bg-pink-500/10">
                          <step.icon className="h-4 w-4 text-pink-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-pink-600">
                            {index + 1} / 3
                          </p>
                          <p className="text-sm font-semibold text-zinc-900">
                            {step.title}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">
                    Questions rapides
                  </p>
                  <div className="mt-4 space-y-4">
                    {SIDEBAR_FAQ.map((item) => (
                      <div key={item.q}>
                        <p className="text-sm font-semibold text-zinc-900">
                          {item.q}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                          {item.a}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/#faq"
                    className="mt-4 inline-block text-xs font-medium text-pink-600 hover:underline"
                  >
                    Voir toute la FAQ →
                  </Link>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">
                    Destinations populaires
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {DESTINATIONS.slice(0, 10).map((city) => (
                      <span
                        key={city}
                        className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600"
                      >
                        📍 {city}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            <div className="lg:hidden">
              <Badge className="mb-5">GPS spoofé · toutes tes apps</Badge>

              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                Fake ta loc.
                <br />
                <span className="gradient-text">{SITE.tagline}</span>
              </h1>

              <p className="mt-4 text-sm leading-relaxed text-zinc-600 sm:text-base">
                {SITE.description} Ton accès {SITE.name} s&apos;active dès la
                validation — pas de screenshot, pas de montage : un vrai signal
                GPS.
              </p>

              <ul className="mt-8 space-y-3">
                {CHECKOUT_PERKS.slice(0, 3).map((perk) => (
                  <li
                    key={perk}
                    className="flex items-start gap-2.5 text-sm text-zinc-700"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              {canceled && (
                <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Paiement annulé. Reprends quand tu veux — ta formule reste
                  sélectionnée.
                </p>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
                  Choisis ton plan
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Tu résilies quand tu veux, sans paperasse.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {PLANS.map((plan) => {
                  const selected = plan.id === selectedPlanId;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => selectPlan(plan.id)}
                      className={cn(
                        "relative flex flex-col rounded-2xl border p-4 text-left transition sm:p-5",
                        selected
                          ? "border-pink-500/40 bg-gradient-to-b from-pink-500/10 to-violet-500/5 ring-1 ring-pink-500/25"
                          : "border-zinc-200 bg-white hover:border-pink-300/60"
                      )}
                    >
                      {plan.popular && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-pink-200 bg-pink-50 px-2.5 py-0.5 text-[10px] font-semibold text-pink-600">
                          Le plus populaire
                        </span>
                      )}
                      {plan.badge && !plan.popular && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-pink-200 bg-pink-50 px-2.5 py-0.5 text-[10px] font-semibold text-pink-600">
                          {plan.badge}
                        </span>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-zinc-900">
                          {plan.name}
                        </span>
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                            selected
                              ? "border-pink-600 bg-pink-600 text-white"
                              : "border-zinc-300"
                          )}
                        >
                          {selected ? (
                            <Check className="h-2.5 w-2.5" strokeWidth={3} />
                          ) : null}
                        </span>
                      </div>

                      <PlanPrice plan={plan} size="card" className="mt-3" />

                      {plan.savings && (
                        <p className="mt-1 text-xs font-medium text-pink-600">
                          {plan.savings}
                        </p>
                      )}

                      {plan.compare && (
                        <p className="mt-2 text-[11px] leading-snug text-zinc-500">
                          {plan.compare}
                        </p>
                      )}

                      <ul className="mt-4 hidden space-y-1.5 border-t border-zinc-100 pt-3 sm:block">
                        {plan.features.slice(0, 3).map((feature) => (
                          <li
                            key={feature}
                            className="flex gap-1.5 text-[11px] text-zinc-600"
                          >
                            <Check className="mt-0.5 h-3 w-3 shrink-0 text-pink-600" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              <Card className="mt-6 flex items-center justify-between gap-4 border-zinc-200 bg-surface-muted/60 p-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Formule sélectionnée
                  </p>
                  <p className="mt-0.5 truncate font-semibold text-zinc-900">
                    {selectedPlan.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {selectedPlan.billedNote}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <PlanPrice plan={selectedPlan} size="summary" align="right" />
                </div>
              </Card>

              {error && (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="relative mt-6">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-900">
                  <CreditCard className="h-4 w-4 text-pink-600" />
                  Paiement sécurisé
                </div>

                {loading && !clientSecret ? (
                  <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-zinc-200 bg-white">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Préparation du checkout Stripe…
                    </div>
                  </div>
                ) : clientSecret ? (
                  <>
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
                  </>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {TRUST_ITEMS.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600"
                  >
                    <Shield className="h-3 w-3 text-emerald-600" />
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-col items-center gap-2 text-center">
                <div className="flex items-center gap-2 text-sm text-zinc-700">
                  <Lock className="h-4 w-4 text-emerald-600" />
                  SSL · chiffrement 256 bits · Stripe
                </div>
                <p className="max-w-md text-xs leading-relaxed text-zinc-500">
                  En validant, tu acceptes nos conditions. Gère ton abonnement
                  depuis ton espace client —{" "}
                  <Link
                    href="/#faq"
                    className="text-pink-600 hover:underline"
                  >
                    questions fréquentes
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
