"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  MapPin,
  Search,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { PLANS, type Plan } from "@/lib/constants";
import {
  ONBOARDING_DESTINATION_KEY,
  searchOnboardingDestinations,
  TRENDING_DESTINATIONS,
  type OnboardingDestination,
} from "@/lib/onboarding-destinations";
import { cn } from "@/lib/utils";

const APP_PREVIEW = [
  { label: "SNAP MAP", color: "text-yellow-500" },
  { label: "INSTAGRAM", color: "text-pink-500" },
  { label: "TINDER", color: "text-rose-500" },
  { label: "LIFE360", color: "text-emerald-500" },
];

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((index) => (
        <div
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-all",
            index <= step ? "w-8 bg-pink-500" : "w-8 bg-zinc-200"
          )}
        />
      ))}
    </div>
  );
}

function DestinationCard({
  destination,
  onSelect,
}: {
  destination: OnboardingDestination;
  onSelect: (destination: OnboardingDestination) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(destination)}
      className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-left shadow-sm transition-all hover:border-pink-300 hover:shadow-md"
    >
      <span className="text-2xl">{destination.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-zinc-900">{destination.city}</p>
        <p className="truncate text-sm text-zinc-500">{destination.area}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
    </button>
  );
}

function StepDestination({
  query,
  onQueryChange,
  onSelect,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (destination: OnboardingDestination) => void;
}) {
  const results = useMemo(() => searchOnboardingDestinations(query), [query]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8 text-center">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-pink-600">
          <Sparkles className="h-4 w-4" />
          Étape 1
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Où tu veux être{" "}
          <span className="gradient-text">maintenant</span> ?
        </h1>
        <p className="mt-3 text-zinc-500">
          Choisis ta destination ou tape n&apos;importe quelle ville.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Recherche une ville..."
          className="h-14 w-full rounded-2xl border border-zinc-200 bg-white pl-12 pr-4 text-base shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
        />
      </div>

      {results.length > 0 ? (
        <div className="mt-4 space-y-2">
          {results.map((destination) => (
            <DestinationCard
              key={destination.id}
              destination={destination}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <div className="mt-10">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-pink-500">
            Destinations Tendance
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {TRENDING_DESTINATIONS.map((destination) => (
              <DestinationCard
                key={destination.id}
                destination={destination}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepPreview({
  destination,
  onContinue,
}: {
  destination: OnboardingDestination;
  onContinue: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-8 text-center">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-pink-600">
          <Sparkles className="h-4 w-4" />
          Étape 2
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Ta loc est à{" "}
          <span className="gradient-text">{destination.city}</span>
        </h1>
        <p className="mt-3 text-zinc-500">
          Voilà ce que tes potes voient sur Snap, Insta et toutes tes apps.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl">
        <div className="bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-3 text-center text-sm font-medium text-white">
          <span className="inline-flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Signal GPS actif
          </span>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
            <span className="text-3xl">{destination.emoji}</span>
            <div>
              <p className="font-semibold text-zinc-900">{destination.city}</p>
              <p className="text-sm text-zinc-500">{destination.area}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {APP_PREVIEW.map((app) => (
              <div
                key={app.label}
                className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {app.label}
                </p>
                <p className="mt-1 flex items-center gap-1 text-sm font-medium text-zinc-800">
                  <MapPin className={cn("h-3.5 w-3.5", app.color)} />
                  {destination.city}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Coordonnées GPS mises à jour en temps réel
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Même signal que si ton tel était vraiment sur place.
      </p>

      <Button className="mt-6 h-14 w-full text-base" onClick={onContinue}>
        Activer cette loc
        <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

function PlanOption({
  plan,
  selected,
  onSelect,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
}) {
  const monthlyEquivalent =
    plan.id === "monthly"
      ? `${plan.price}/mois`
      : plan.id === "6months"
        ? "≈ 5,82 €/mois"
        : "≈ 4,16 €/mois";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full rounded-2xl border px-5 py-4 text-left transition-all",
        selected
          ? "border-pink-400 bg-gradient-to-r from-pink-50 to-violet-50 shadow-sm"
          : "border-zinc-200 bg-white hover:border-pink-200"
      )}
    >
      {plan.id === "6months" && (
        <span className="absolute -top-2.5 right-4 rounded-full bg-pink-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Le plus populaire
        </span>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
              selected
                ? "border-pink-500 bg-pink-500 text-white"
                : "border-zinc-300 bg-white"
            )}
          >
            {selected && <Check className="h-3 w-3" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-zinc-900">{plan.name}</p>
            <p className="text-sm text-zinc-500">{monthlyEquivalent}</p>
            {plan.savings && (
              <p className="mt-0.5 text-xs font-medium text-pink-600">
                {plan.savings}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold text-zinc-900">{plan.price}</p>
          <p className="text-xs text-zinc-500">{plan.period}</p>
        </div>
      </div>
    </button>
  );
}

function StepPaywall({
  destination,
  selectedPlanId,
  onPlanChange,
  onBack,
}: {
  destination: OnboardingDestination;
  selectedPlanId: string;
  onPlanChange: (planId: string) => void;
  onBack: () => void;
}) {
  const checkoutHref = `/signup?plan=${selectedPlanId}`;

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-4 py-1.5 text-sm font-medium text-pink-700">
          {destination.emoji} {destination.city} sélectionné
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Active ta loc à{" "}
          <span className="gradient-text">{destination.city}</span>
        </h1>
        <p className="mt-3 text-zinc-500">
          Plus que le paiement — ta position change dès l&apos;installation.
        </p>
      </div>

      <div className="space-y-3">
        {PLANS.map((plan) => (
          <PlanOption
            key={plan.id}
            plan={plan}
            selected={selectedPlanId === plan.id}
            onSelect={() => onPlanChange(plan.id)}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-pink-500" />
          Paiement 100% sécurisé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-pink-500" />
          Accès instantané
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-pink-500" />
          Garantie 48 h
        </span>
      </div>

      <Link href={checkoutHref} className="mt-6 block">
        <Button className="h-14 w-full text-base">
          Continuer vers le paiement
          <ArrowRight className="h-5 w-5" />
        </Button>
      </Link>

      <button
        type="button"
        onClick={onBack}
        className="mt-4 w-full text-center text-sm text-zinc-500 transition-colors hover:text-zinc-800"
      >
        Changer de destination
      </button>
    </div>
  );
}

export function OnboardingView() {
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [destination, setDestination] = useState<OnboardingDestination>(
    TRENDING_DESTINATIONS[0]
  );
  const [selectedPlanId, setSelectedPlanId] = useState("6months");

  function selectDestination(next: OnboardingDestination) {
    setDestination(next);
    setQuery("");
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        ONBOARDING_DESTINATION_KEY,
        JSON.stringify(next)
      );
    }
    setStep(2);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-zinc-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo href="/" />
          <ProgressBar step={step} />
        </div>
      </header>

      <main className="px-4 py-10 sm:px-6 sm:py-14">
        {step === 1 && (
          <StepDestination
            query={query}
            onQueryChange={setQuery}
            onSelect={selectDestination}
          />
        )}

        {step === 2 && (
          <StepPreview
            destination={destination}
            onContinue={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <StepPaywall
            destination={destination}
            selectedPlanId={selectedPlanId}
            onPlanChange={setSelectedPlanId}
            onBack={() => setStep(1)}
          />
        )}
      </main>
    </div>
  );
}
