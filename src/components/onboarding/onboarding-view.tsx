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
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { OnboardingAhaMoment } from "@/components/onboarding/onboarding-aha-moment";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { PLANS, type Plan } from "@/lib/constants";
import {
  ONBOARDING_DESTINATION_KEY,
  searchOnboardingDestinations,
  TRENDING_DESTINATIONS,
  type OnboardingDestination,
} from "@/lib/onboarding-destinations";
import { getDestinationSocialProof } from "@/lib/onboarding-social-proof";
import { cn } from "@/lib/utils";

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
      className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition-all hover:border-pink-300 hover:shadow-md"
    >
      <div
        className={cn(
          "relative flex h-24 items-end bg-gradient-to-br p-4",
          destination.imageGradient
        )}
      >
        <span className="text-3xl drop-shadow-sm">{destination.emoji}</span>
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
      </div>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-zinc-900">{destination.city}</p>
          <p className="truncate text-sm text-zinc-500">{destination.area}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5" />
      </div>
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

      <OnboardingAhaMoment destination={destination} />

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
      {plan.popular && (
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
            <p className="text-sm text-zinc-500">
              {plan.perDay} {plan.perDayLabel}
            </p>
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
  const socialProof = getDestinationSocialProof(destination);
  const selectedPlan = PLANS.find((plan) => plan.id === selectedPlanId) ?? PLANS[2];

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-4 py-1.5 text-sm font-medium text-pink-700">
          {destination.emoji} {destination.city} sélectionné
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Débloque ta loc à{" "}
          <span className="gradient-text">{destination.city}</span>
        </h1>
        <p className="mt-3 text-zinc-500">
          Plus que le paiement — ta position change dès l&apos;installation.
        </p>
      </div>

      <div
        className={cn(
          "mb-5 overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br p-4",
          destination.imageGradient
        )}
      >
        <div className="flex items-center justify-between rounded-xl bg-white/85 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{destination.emoji}</span>
            <div>
              <p className="font-semibold text-zinc-900">{destination.city}</p>
              <p className="text-sm text-zinc-500">{destination.area}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-pink-600">
            <MapPin className="h-4 w-4" />
            Prête
          </div>
        </div>
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

      <p className="mt-4 text-center text-xs text-zinc-500">
        {socialProof.weeklyLabel}
      </p>

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
          Débloquer {destination.city} — {selectedPlan.perDay} {selectedPlan.perDayLabel}
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
  const [selectedPlanId, setSelectedPlanId] = useState("annual");

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
