"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Loader2,
  Search,
  Shield,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import type { GeocodeResult } from "@/lib/geocoding";
import { OnboardingAhaMoment } from "@/components/onboarding/onboarding-aha-moment";
import { OnboardingBeforeAfter } from "@/components/onboarding/onboarding-before-after";
import { OnboardingPaywallPreview } from "@/components/onboarding/onboarding-paywall-preview";
import { OnboardingPaywallStripe } from "@/components/onboarding/onboarding-paywall-stripe";
import { OnboardingPreviewMap } from "@/components/onboarding/onboarding-preview-map";
import { OnboardingUseCaseStep } from "@/components/onboarding/onboarding-use-case-step";
import { OnboardingValueRecap } from "@/components/onboarding/onboarding-value-recap";
import { PaywallValueStack } from "@/components/pricing/paywall-value-stack";
import { PlanPrice } from "@/components/pricing/plan-price";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import {
  isValidPlanId,
  ONBOARDING_TOTAL_STEPS,
  PAYWALL_TESTIMONIALS,
  PLANS,
  type Plan,
} from "@/lib/constants";
import {
  mergeOnboardingSearchResults,
  ONBOARDING_DESTINATION_KEY,
  searchOnboardingDestinations,
  TRENDING_DESTINATIONS,
  type OnboardingDestination,
} from "@/lib/onboarding-destinations";
import { getDestinationSocialProof } from "@/lib/onboarding-social-proof";
import {
  DEFAULT_USE_CASE_ID,
  getUseCaseById,
  isValidUseCaseId,
  ONBOARDING_USE_CASE_KEY,
  type OnboardingUseCase,
} from "@/lib/onboarding-use-cases";
import { cn } from "@/lib/utils";

const PAYWALL_STEP = ONBOARDING_TOTAL_STEPS;

function ProgressBar({ step }: { step: number }) {
  const percent = Math.round((step / ONBOARDING_TOTAL_STEPS) * 100);

  return (
    <div className="flex min-w-0 shrink-0 flex-col items-end gap-1.5">
      <span className="text-[11px] font-semibold tabular-nums text-zinc-500 sm:hidden">
        {step}/{ONBOARDING_TOTAL_STEPS}
      </span>
      <div className="h-1 w-20 overflow-hidden rounded-full bg-zinc-200 sm:hidden">
        <div
          className="h-full rounded-full bg-pink-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="hidden items-center gap-1 sm:flex sm:gap-1.5">
        {Array.from({ length: ONBOARDING_TOTAL_STEPS }, (_, index) => index + 1).map(
          (index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index <= step ? "w-7 bg-pink-500 lg:w-8" : "w-7 bg-zinc-200 lg:w-8"
              )}
            />
          )
        )}
      </div>
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
      className="group flex w-full min-w-0 max-w-full items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white px-3.5 py-3.5 text-left shadow-sm transition-all hover:border-pink-300 hover:shadow-md sm:gap-3 sm:px-4"
    >
      <span className="shrink-0 text-2xl">{destination.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-zinc-900">{destination.city}</p>
        <p className="truncate text-sm text-zinc-500">{destination.area}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-transform sm:group-hover:translate-x-0.5" />
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
  const [apiResults, setApiResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length >= 2;
  const localResults = useMemo(
    () => searchOnboardingDestinations(query),
    [query]
  );
  const results = useMemo(
    () => mergeOnboardingSearchResults(localResults, apiResults),
    [apiResults, localResults]
  );

  useEffect(() => {
    if (!isSearching) {
      setApiResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch(`/api/geocode?q=${encodeURIComponent(trimmedQuery)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = (await response.json()) as {
            results?: GeocodeResult[];
            error?: string;
          };

          if (!response.ok) {
            throw new Error(data.error ?? "Recherche indisponible.");
          }

          setApiResults(data.results ?? []);
        })
        .catch((fetchError) => {
          if (controller.signal.aborted) {
            return;
          }

          setApiResults([]);
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Recherche indisponible."
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isSearching, trimmedQuery]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl">
      <div className="mb-8 text-center">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-pink-600">
          <Sparkles className="h-4 w-4 shrink-0" />
          Étape 2
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          Où tu veux être{" "}
          <span className="gradient-text">maintenant</span> ?
        </h1>
        <p className="mt-3 text-sm text-zinc-500 sm:text-base">
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
          autoComplete="off"
          className="h-14 w-full rounded-2xl border border-zinc-200 bg-white pl-12 pr-12 text-base shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
        />
        {loading && (
          <Loader2 className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-pink-500" />
        )}
      </div>

      {isSearching ? (
        <div className="mt-4">
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {!error && !loading && results.length === 0 && (
            <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
              Aucun lieu trouvé. Essaie un autre nom ou des coordonnées GPS.
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((destination) => (
                <DestinationCard
                  key={destination.id}
                  destination={destination}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-10">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-pink-500">
            Destinations Tendance
          </p>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
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
  useCase,
  onContinue,
  onChangeDestination,
  onDestinationChange,
}: {
  destination: OnboardingDestination;
  useCase: OnboardingUseCase;
  onContinue: () => void;
  onChangeDestination: () => void;
  onDestinationChange: (lat: number, lng: number) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-8 text-center">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-pink-600">
          <Sparkles className="h-4 w-4" />
          Étape 4
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          On téléporte ta loc à{" "}
          <span className="gradient-text">{destination.city}</span>
        </h1>
        <p className="mt-3 text-sm text-zinc-500 sm:text-base">
          Regarde le signal GPS se mettre à jour en direct sur {useCase.appName}.
        </p>
      </div>

      <OnboardingAhaMoment
        destination={destination}
        highlightApp={useCase.mapLabel}
      />
      <OnboardingPreviewMap
        destination={destination}
        onDestinationChange={onDestinationChange}
      />

      <p className="mt-6 text-center text-sm text-zinc-500">
        Même signal que si ton tel était vraiment sur place.
      </p>

      <Button className="mt-6 h-14 w-full text-base" onClick={onContinue}>
        Continuer
        <ArrowRight className="h-5 w-5" />
      </Button>

      <button
        type="button"
        onClick={onChangeDestination}
        className="mt-4 w-full text-center text-sm text-zinc-500 transition-colors hover:text-zinc-800"
      >
        Essayer une autre ville
      </button>
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
        "relative w-full rounded-2xl border px-3.5 py-3.5 text-left transition-all sm:px-5 sm:py-4",
        selected
          ? "border-pink-400 bg-gradient-to-r from-pink-50 to-violet-50 shadow-sm"
          : "border-zinc-200 bg-white hover:border-pink-200"
      )}
    >
      {plan.popular && (
        <span className="absolute -top-2.5 right-3 rounded-full bg-pink-500 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white sm:right-4 sm:px-2.5 sm:text-[10px]">
          Le plus populaire
        </span>
      )}

      <div className="flex items-center justify-between gap-2 sm:gap-4">
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
            {plan.savings && (
              <p className="mt-0.5 text-xs font-medium text-pink-600">
                {plan.savings}
              </p>
            )}
            {plan.compare && !plan.savings && (
              <p className="mt-0.5 text-xs text-zinc-500">{plan.compare}</p>
            )}
          </div>
        </div>
        <PlanPrice plan={plan} size="card" align="right" className="shrink-0" />
      </div>

      <div className="mt-3 border-t border-zinc-200 pt-3">
        <PaywallValueStack compact showHeading />
      </div>
    </button>
  );
}

function StepPaywall({
  destination,
  useCase,
  selectedPlanId,
  onPlanChange,
  onBack,
  stripePublishableKey,
}: {
  destination: OnboardingDestination;
  useCase: OnboardingUseCase;
  selectedPlanId: string;
  onPlanChange: (planId: string) => void;
  onBack: () => void;
  stripePublishableKey: string;
}) {
  const fallbackProof = getDestinationSocialProof(destination);
  const [weeklyLabel, setWeeklyLabel] = useState(fallbackProof.weeklyLabel);
  const testimonial =
    PAYWALL_TESTIMONIALS[
      destination.city.length % PAYWALL_TESTIMONIALS.length
    ];

  useEffect(() => {
    const controller = new AbortController();

    void fetch(
      `/api/onboarding/social-proof?city=${encodeURIComponent(destination.city)}`,
      { signal: controller.signal }
    )
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as { weeklyLabel?: string };
      })
      .then((data) => {
        if (data?.weeklyLabel) {
          setWeeklyLabel(data.weeklyLabel);
        }
      })
      .catch(() => {
        // Keep fallback social proof.
      });

    return () => controller.abort();
  }, [destination.city]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 text-center">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-pink-600">
          <Sparkles className="h-4 w-4" />
          Étape {PAYWALL_STEP}
        </p>
        <span className="mt-3 inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-700 sm:px-4 sm:text-sm">
          <span>{destination.emoji} {destination.city}</span>
          <span className="text-pink-400">·</span>
          <span>{useCase.emoji} {useCase.label}</span>
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          Débloque ta loc à{" "}
          <span className="gradient-text">{destination.city}</span>
        </h1>
        <p className="mt-3 text-sm text-zinc-500 sm:text-base">
          Tous les plans incluent le même accès complet — seule la durée change.
        </p>
      </div>

      <OnboardingPaywallPreview destination={destination} />

      <div className="mt-6 space-y-3">
        {PLANS.map((plan) => (
          <PlanOption
            key={plan.id}
            plan={plan}
            selected={selectedPlanId === plan.id}
            onSelect={() => onPlanChange(plan.id)}
          />
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-zinc-500">{weeklyLabel}</p>

      <figure className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-center">
        <blockquote className="text-sm text-zinc-700">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>
        <figcaption className="mt-1 text-xs text-zinc-500">
          — {testimonial.author}, {testimonial.city}
        </figcaption>
      </figure>

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

      <OnboardingPaywallStripe
        planId={selectedPlanId}
        stripePublishableKey={stripePublishableKey}
      />

      <button
        type="button"
        onClick={onBack}
        className="mt-6 w-full text-center text-sm text-zinc-500 transition-colors hover:text-zinc-800"
      >
        Changer de destination
      </button>
    </div>
  );
}

function readStoredUseCase(): OnboardingUseCase {
  if (typeof window === "undefined") {
    return getUseCaseById(DEFAULT_USE_CASE_ID);
  }

  try {
    const stored = window.sessionStorage.getItem(ONBOARDING_USE_CASE_KEY);
    if (stored && isValidUseCaseId(stored)) {
      return getUseCaseById(stored);
    }
  } catch {
    // Ignore invalid stored use case.
  }

  return getUseCaseById(DEFAULT_USE_CASE_ID);
}

function readStoredDestination(): OnboardingDestination | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.sessionStorage.getItem(ONBOARDING_DESTINATION_KEY);
    if (!stored) {
      return null;
    }

    return JSON.parse(stored) as OnboardingDestination;
  } catch {
    return null;
  }
}

function OnboardingViewContent({
  stripePublishableKey,
}: {
  stripePublishableKey: string;
}) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [useCase, setUseCase] = useState<OnboardingUseCase>(() =>
    getUseCaseById(DEFAULT_USE_CASE_ID)
  );
  const [destination, setDestination] = useState<OnboardingDestination>(
    TRENDING_DESTINATIONS[0]
  );
  const [selectedPlanId, setSelectedPlanId] = useState(() => {
    const plan = searchParams.get("plan") ?? undefined;
    return isValidPlanId(plan) ? plan! : "annual";
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [step]);

  useEffect(() => {
    const stepParam = searchParams.get("step");
    const paywallStep =
      stepParam === String(PAYWALL_STEP) || stepParam === "3" ? PAYWALL_STEP : null;

    if (!paywallStep) {
      return;
    }

    setStep(paywallStep);

    const storedDestination = readStoredDestination();
    if (storedDestination) {
      setDestination(storedDestination);
    }

    setUseCase(readStoredUseCase());
  }, [searchParams]);

  function persistUseCase(next: OnboardingUseCase) {
    setUseCase(next);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(ONBOARDING_USE_CASE_KEY, next.id);
    }
  }

  function persistDestination(next: OnboardingDestination) {
    setDestination(next);
    setQuery("");
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        ONBOARDING_DESTINATION_KEY,
        JSON.stringify(next)
      );
    }
  }

  function selectUseCase(next: OnboardingUseCase) {
    persistUseCase(next);
    setStep(2);
  }

  function selectDestination(next: OnboardingDestination) {
    persistDestination(next);
    setStep(3);
  }

  function updateDestinationCoords(lat: number, lng: number) {
    setDestination((current) => {
      const next = { ...current, lat, lng };
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          ONBOARDING_DESTINATION_KEY,
          JSON.stringify(next)
        );
      }
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-zinc-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Logo href="/" size="sm" nameClassName="hidden min-[380px]:inline text-base sm:text-lg" />
          <ProgressBar step={step} />
        </div>
      </header>

      <main className="min-w-0 max-w-full px-4 py-8 pb-10 sm:px-6 sm:py-14">
        {step === 1 && <OnboardingUseCaseStep onSelect={selectUseCase} />}

        {step === 2 && (
          <StepDestination
            query={query}
            onQueryChange={setQuery}
            onSelect={selectDestination}
          />
        )}

        {step === 3 && (
          <OnboardingBeforeAfter
            useCase={useCase}
            destination={destination}
            onContinue={() => setStep(4)}
          />
        )}

        {step === 4 && (
          <StepPreview
            destination={destination}
            useCase={useCase}
            onContinue={() => setStep(5)}
            onChangeDestination={() => setStep(2)}
            onDestinationChange={updateDestinationCoords}
          />
        )}

        {step === 5 && (
          <OnboardingValueRecap
            useCase={useCase}
            destination={destination}
            onContinue={() => setStep(PAYWALL_STEP)}
          />
        )}

        {step === PAYWALL_STEP && (
          <StepPaywall
            destination={destination}
            useCase={useCase}
            selectedPlanId={selectedPlanId}
            onPlanChange={setSelectedPlanId}
            onBack={() => setStep(2)}
            stripePublishableKey={stripePublishableKey}
          />
        )}
      </main>
    </div>
  );
}

export function OnboardingView({
  stripePublishableKey,
}: {
  stripePublishableKey: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement…
        </div>
      }
    >
      <OnboardingViewContent stripePublishableKey={stripePublishableKey} />
    </Suspense>
  );
}
