"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { capturePostHogClientEvent } from "@/lib/posthog/browser";
import {
  ArrowRight,
  ChevronRight,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import type { GeocodeResult } from "@/lib/geocoding";
import { OnboardingAhaMoment } from "@/components/onboarding/onboarding-aha-moment";
import { OnboardingPreviewMap } from "@/components/onboarding/onboarding-preview-map";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import {
  getPostOnboardingSignupUrl,
  isValidPlanId,
  ONBOARDING_TOTAL_STEPS,
} from "@/lib/constants";
import {
  mergeOnboardingSearchResults,
  ONBOARDING_DESTINATION_KEY,
  searchOnboardingDestinations,
  TRENDING_DESTINATIONS,
  type OnboardingDestination,
} from "@/lib/onboarding-destinations";
import { TRIAL_CTA_LABEL } from "@/lib/trial";
import { cn } from "@/lib/utils";

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
          Étape 1
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
  onContinue,
  onChangeDestination,
  onDestinationChange,
}: {
  destination: OnboardingDestination;
  onContinue: () => void;
  onChangeDestination: () => void;
  onDestinationChange: (lat: number, lng: number) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-8 text-center">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-pink-600">
          <Sparkles className="h-4 w-4" />
          Étape 2
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          On téléporte ta loc à{" "}
          <span className="gradient-text">{destination.city}</span>
        </h1>
        <p className="mt-3 text-sm text-zinc-500 sm:text-base">
          Regarde le signal GPS se mettre à jour en direct sur Snap, Insta, Tinder
          et toutes tes apps.
        </p>
      </div>

      <OnboardingAhaMoment destination={destination} highlightApp="TES APPS" />
      <OnboardingPreviewMap
        destination={destination}
        onDestinationChange={onDestinationChange}
      />

      <p className="mt-6 text-center text-sm text-zinc-500">
        Même signal que si ton tel était vraiment sur place.
      </p>

      <Button className="mt-6 h-14 w-full text-base" onClick={onContinue}>
        {TRIAL_CTA_LABEL}
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

function OnboardingViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [destination, setDestination] = useState<OnboardingDestination>(
    TRENDING_DESTINATIONS[0]
  );
  const selectedPlanId = useMemo(() => {
    const plan = searchParams.get("plan") ?? undefined;
    if (isValidPlanId(plan)) {
      return plan!;
    }
    return "annual";
  }, [searchParams]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [step]);

  useEffect(() => {
    const stepNames = {
      1: "destination",
      2: "preview",
    } as const;
    capturePostHogClientEvent("onboarding_step_viewed", {
      step,
      step_name: stepNames[step as keyof typeof stepNames],
    });
  }, [step]);

  useEffect(() => {
    const stepParam = searchParams.get("step");
    const legacyTrialStep =
      stepParam === "3" || stepParam === "6" || stepParam === String(ONBOARDING_TOTAL_STEPS + 1);

    if (legacyTrialStep) {
      router.replace(getPostOnboardingSignupUrl(selectedPlanId));
      return;
    }

    const storedDestination = readStoredDestination();
    if (storedDestination) {
      setDestination(storedDestination);
    }
  }, [router, searchParams, selectedPlanId]);

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

  function selectDestination(next: OnboardingDestination) {
    persistDestination(next);
    setStep(2);
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

  function continueToSignup() {
    capturePostHogClientEvent("onboarding_completed", {
      destination_city: destination.city,
      plan: selectedPlanId,
    });
    router.push(getPostOnboardingSignupUrl(selectedPlanId));
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Logo href="/" size="sm" nameClassName="hidden min-[380px]:inline text-base sm:text-lg" />
          <ProgressBar step={step} />
        </div>
      </header>

      <main className="relative min-w-0 max-w-full px-4 py-8 sm:px-6 sm:py-14">
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
            onContinue={continueToSignup}
            onChangeDestination={() => setStep(1)}
            onDestinationChange={updateDestinationCoords}
          />
        )}
      </main>
    </div>
  );
}

export function OnboardingView() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement…
        </div>
      }
    >
      <OnboardingViewContent />
    </Suspense>
  );
}
