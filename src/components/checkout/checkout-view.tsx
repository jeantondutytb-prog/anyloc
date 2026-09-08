"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Shield, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Logo } from "@/components/ui/logo";
import { StripeEmbeddedCheckout } from "@/components/checkout/stripe-embedded-checkout";
import { CHECKOUT_PERKS, PLANS, SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const VALUE_PROPS = [
  {
    title: "Le monde entier comme terrain de jeu",
    description:
      "Marbella ce soir, Miami demain — pose ton pin où tu veux, en direct.",
  },
  {
    title: "Une position que personne peut griller",
    description:
      "C'est ta vraie position système, pas un screenshot ni un montage.",
  },
  {
    title: "Guidé pas à pas, pour ton modèle",
    description:
      "Android : tout depuis ton tel. iPhone : une mise en route depuis l'ordi, puis l'app iPhone en 1 an.",
  },
  {
    title: "Zéro engagement",
    description:
      "Résiliation en 1 clic, quand tu veux, sans avoir à te justifier.",
  },
];

const TRUST_ITEMS = [
  "Paiement 100% sécurisé",
  "Annulation en 1 clic, sans justificatif",
  "Accès immédiat après paiement",
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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-5">
          <Logo nameClassName="text-base font-extrabold tracking-tight sm:text-lg" />
          <Link
            href="/"
            className="text-sm text-zinc-500 transition hover:text-zinc-900"
          >
            ← Accueil
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-10">
          <div className="mb-8 text-center">
            <p className="inline-flex items-center rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">
              Accès immédiat · résiliable en 1 clic
            </p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              Débloque ta loc.
              <br />
              <span className="gradient-text">Change de ville en 30 secondes.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base">
              Pas un screenshot, pas un montage : ta{" "}
              <span className="font-semibold text-zinc-900">
                vraie position système
              </span>
              , en direct. Ton accès se débloque à la seconde.
            </p>
          </div>

          {canceled && (
            <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Paiement annulé. Tu peux réessayer quand tu veux.
            </p>
          )}

          <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-extrabold tracking-tight text-zinc-900">
              Ce que tu débloques aujourd&apos;hui
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {VALUE_PROPS.map((item) => (
                <div key={item.title} className="rounded-xl bg-zinc-50 p-4">
                  <p className="text-sm font-bold text-zinc-900">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-4">
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-900">
              Choisis ta formule
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Le flex ne vaut que s&apos;il est permanent — plus tu prends
              long, moins tu payes.
            </p>
          </section>

          <div className="grid gap-3 sm:grid-cols-3">
            {PLANS.map((plan) => {
              const selected = plan.id === selectedPlanId;

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => selectPlan(plan.id)}
                  className={cn(
                    "relative rounded-2xl border-2 p-5 text-left transition",
                    selected
                      ? "border-zinc-900 bg-pink-50/80 ring-1 ring-pink-500/20"
                      : "border-zinc-200 bg-white hover:border-zinc-400"
                  )}
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
                      {plan.badge}
                    </span>
                  )}
                  {plan.popular && !plan.badge && (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-pink-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
                      Populaire
                    </span>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-zinc-900">{plan.name}</span>
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border-2",
                        selected
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200"
                      )}
                    >
                      {selected ? (
                        <span className="text-[10px]">✓</span>
                      ) : null}
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-zinc-900">
                      {plan.perMonth}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {plan.perMonthLabel}
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-semibold text-zinc-700">
                    Facturé {plan.price} {plan.period}
                  </p>

                  {plan.compare && (
                    <p
                      className={cn(
                        "mt-1 text-[11px] leading-snug",
                        plan.id === "annual"
                          ? "font-bold text-zinc-900"
                          : "text-zinc-500"
                      )}
                    >
                      {plan.id === "annual" ? "✓ " : ""}
                      {plan.compare}
                    </p>
                  )}

                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    Satisfait ou remboursé
                  </div>

                  <div className="mt-4 border-t border-zinc-100 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                      Ce que ta formule inclut
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {plan.features.slice(0, 4).map((feature) => (
                        <li
                          key={feature}
                          className="flex gap-1.5 text-[11px] leading-snug text-zinc-600"
                        >
                          <span className="shrink-0 font-bold text-pink-600">
                            ✓
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border-2 border-zinc-900 bg-pink-50/50 p-4">
            <p className="text-sm font-semibold text-zinc-900">
              Tu débloques : téléportation illimitée partout · ta vraie position
              système (pas un screenshot) · installation guidée pas à pas.
            </p>
            <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-zinc-200 pt-3">
              <span className="text-sm font-bold text-zinc-900">
                {selectedPlan.name}
              </span>
              <span className="shrink-0 whitespace-nowrap">
                <span className="text-xl font-extrabold text-zinc-900">
                  {selectedPlan.price}
                </span>{" "}
                <span className="text-xs text-zinc-500">
                  {selectedPlan.period}
                </span>
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {selectedPlan.billedNote}
            </p>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="relative mt-6">
            {loading && !clientSecret ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-zinc-200 bg-white">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ouverture du paiement sécurisé…
                </div>
              </div>
            ) : clientSecret ? (
              <>
                {updating ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mise à jour du montant…
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

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {TRUST_ITEMS.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center text-xs font-semibold text-zinc-700"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Lock className="h-4 w-4 text-emerald-600" />
              Paiement 100% sécurisé
            </div>
            <p className="text-xs text-zinc-500">
              Certificat SSL · chiffré 256 bits · via Stripe
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" />
                {CHECKOUT_PERKS[CHECKOUT_PERKS.length - 1]}
              </span>
            </div>
            <p className="max-w-lg text-xs leading-relaxed text-zinc-500">
              En payant, tu acceptes nos conditions d&apos;utilisation. Tu peux
              annuler à tout moment depuis ton espace client.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
