"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ArrowRight, Loader2, MapPin, Sparkles } from "lucide-react";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import type { OnboardingUseCase } from "@/lib/onboarding-use-cases";
import { getFallbackApproxLocation } from "@/lib/approx-user-location";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AnimationPhase = "before" | "transition" | "after";

type LocationState =
  | { status: "loading" }
  | { status: "ready"; city: string; area: string; resolved: boolean };

const BEFORE_HOLD_MS = 2800;
const TRANSITION_MS = 3200;
const AFTER_REVEAL_MS = 800;

function PhoneMockup({
  label,
  location,
  sublocation,
  variant,
  appLabel,
  pinClass,
  pulse = false,
}: {
  label: string;
  location: string;
  sublocation: string;
  variant: "before" | "after";
  appLabel: string;
  pinClass: string;
  pulse?: boolean;
}) {
  const isAfter = variant === "after";

  return (
    <div className="flex w-full max-w-[200px] flex-col items-center sm:max-w-[200px]">
      <p
        className={cn(
          "mb-2 text-[10px] font-semibold uppercase tracking-wider sm:mb-3 sm:text-xs",
          isAfter ? "text-pink-600" : "text-zinc-400"
        )}
      >
        {label}
      </p>
      <div
        className={cn(
          "w-full overflow-hidden rounded-[1.5rem] border-[3px] shadow-lg transition-shadow duration-700 sm:rounded-[1.75rem] sm:border-4",
          isAfter
            ? "border-pink-400 bg-gradient-to-b from-pink-50 to-white shadow-pink-200/40"
            : "border-zinc-300 bg-zinc-50"
        )}
      >
        <div className="bg-zinc-900 px-3 py-1.5 text-center sm:px-4 sm:py-2">
          <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-zinc-400 sm:text-[10px]">
            {appLabel}
          </p>
        </div>
        <div className="relative aspect-[9/14] bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-50 p-2 sm:p-3">
          <div className="absolute inset-2 rounded-xl bg-white/60 backdrop-blur-sm sm:inset-3" />
          <div className="relative flex h-full flex-col items-center justify-center gap-1.5 p-1.5 sm:gap-2 sm:p-2">
            <motion.div
              animate={
                pulse
                  ? { scale: [1, 1.08, 1] }
                  : isAfter
                    ? { scale: [1, 1.15, 1] }
                    : {}
              }
              transition={
                pulse || isAfter
                  ? {
                      duration: pulse ? 1.6 : 0.7,
                      repeat: pulse ? Infinity : 0,
                      ease: "easeInOut",
                    }
                  : {}
              }
            >
              <MapPin
                className={cn(
                  "h-7 w-7 sm:h-8 sm:w-8",
                  isAfter ? pinClass : "text-zinc-400"
                )}
              />
            </motion.div>
            <p
              className={cn(
                "line-clamp-2 w-full break-words text-center text-xs font-bold sm:text-sm",
                isAfter ? "text-zinc-900" : "text-zinc-500"
              )}
            >
              {location}
            </p>
            <p className="line-clamp-2 w-full break-words text-center text-[10px] text-zinc-500 sm:text-[11px]">
              {sublocation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransitionIndicator({
  isTransition,
  showAfter,
}: {
  isTransition: boolean;
  showAfter: boolean;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 py-1 sm:gap-2 sm:py-0">
      <motion.div
        animate={{
          opacity: showAfter ? 1 : isTransition ? 1 : 0.45,
          scale: isTransition ? [1, 1.12, 1] : showAfter ? 1 : 0.92,
          y: isTransition ? [0, 3, 0] : 0,
          x: isTransition ? [0, 4, 0] : 0,
        }}
        transition={
          isTransition
            ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.45 }
        }
        className="flex items-center justify-center"
      >
        <ArrowDown className="h-5 w-5 text-pink-400 sm:hidden" />
        <ArrowRight className="hidden h-6 w-6 text-pink-400 sm:block sm:h-8 sm:w-8" />
      </motion.div>

      <AnimatePresence mode="wait">
        {isTransition && (
          <motion.p
            key="transition-label"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1 whitespace-nowrap text-[10px] font-medium text-pink-600"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Téléportation…
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function LocationLoadingSkeleton({ appLabel }: { appLabel: string }) {
  return (
    <div className="mx-auto w-full max-w-sm sm:max-w-md">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-10">
        {[0, 1].map((index) => (
          <div key={index} className="flex w-full max-w-[200px] flex-col items-center">
            <div className="mb-2 h-3 w-12 animate-pulse rounded-full bg-zinc-200 sm:mb-3" />
            <div
              className={cn(
                "w-full overflow-hidden rounded-[1.5rem] border-[3px] border-zinc-200 bg-zinc-50 sm:rounded-[1.75rem] sm:border-4",
                index === 1 && "opacity-50"
              )}
            >
              <div className="bg-zinc-200 px-3 py-1.5 text-center sm:px-4 sm:py-2">
                <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-zinc-400 sm:text-[10px]">
                  {appLabel}
                </p>
              </div>
              <div className="flex aspect-[9/14] flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-100 to-zinc-50 p-4">
                <Loader2 className="h-7 w-7 animate-spin text-pink-400" />
                <div className="h-3 w-20 animate-pulse rounded-full bg-zinc-200" />
                <div className="h-2 w-24 animate-pulse rounded-full bg-zinc-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 flex items-center justify-center gap-2 px-2 text-center text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-pink-500" />
        On localise ta position actuelle…
      </p>
    </div>
  );
}

export function OnboardingBeforeAfter({
  useCase,
  destination,
  onContinue,
}: {
  useCase: OnboardingUseCase;
  destination: OnboardingDestination;
  onContinue: () => void;
}) {
  const [locationState, setLocationState] = useState<LocationState>({
    status: "loading",
  });
  const [phase, setPhase] = useState<AnimationPhase>("before");
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLocationState({ status: "loading" });

    void fetch("/api/onboarding/approx-location", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as {
          found?: boolean;
          city?: string;
          area?: string;
        };
      })
      .then((data) => {
        const fallback = getFallbackApproxLocation();

        setLocationState({
          status: "ready",
          city: data?.city ?? fallback.city,
          area: data?.area ?? fallback.area,
          resolved: data?.found === true,
        });
      })
      .catch(() => {
        const fallback = getFallbackApproxLocation();
        setLocationState({
          status: "ready",
          city: fallback.city,
          area: fallback.area,
          resolved: false,
        });
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (locationState.status !== "ready") {
      setPhase("before");
      setCanContinue(false);
      return;
    }

    setPhase("before");
    setCanContinue(false);

    const transitionTimer = window.setTimeout(
      () => setPhase("transition"),
      BEFORE_HOLD_MS
    );
    const afterTimer = window.setTimeout(
      () => setPhase("after"),
      BEFORE_HOLD_MS + TRANSITION_MS
    );
    const continueTimer = window.setTimeout(
      () => setCanContinue(true),
      BEFORE_HOLD_MS + TRANSITION_MS + AFTER_REVEAL_MS
    );

    return () => {
      window.clearTimeout(transitionTimer);
      window.clearTimeout(afterTimer);
      window.clearTimeout(continueTimer);
    };
  }, [destination.id, useCase.id, locationState]);

  const isReady = locationState.status === "ready";
  const currentLocation = isReady
    ? locationState
    : { city: "", area: "", resolved: false };
  const showAfter = phase === "after";
  const isTransition = phase === "transition";
  const personalizedCopy = isReady && currentLocation.resolved;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 text-center sm:mb-8">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-pink-600">
          <Sparkles className="h-4 w-4 shrink-0" />
          Étape 3
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          Voilà ce que tes potes verront sur{" "}
          <span className="gradient-text">{useCase.appName}</span>
        </h1>
        <p className="mt-3 px-1 text-sm text-zinc-500 sm:text-base">
          {!isReady
            ? "On prépare ta comparaison avant / après…"
            : personalizedCopy
              ? `De ${currentLocation.city} à ${destination.city} — en un clic.`
              : "Avant / après — même app, nouvelle ville en un clic."}
        </p>
      </div>

      {!isReady ? (
        <LocationLoadingSkeleton appLabel={useCase.mapLabel} />
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-6 lg:gap-8">
          <motion.div
            key={`before-${destination.id}-${currentLocation.city}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="flex w-full justify-center sm:flex-1"
          >
            <PhoneMockup
              label="Avant"
              location={currentLocation.city}
              sublocation={currentLocation.area}
              variant="before"
              appLabel={useCase.mapLabel}
              pinClass={useCase.pinColor}
              pulse={phase === "before" || isTransition}
            />
          </motion.div>

          <TransitionIndicator
            isTransition={isTransition}
            showAfter={showAfter}
          />

          <motion.div
            key={`after-${destination.id}-${showAfter}`}
            initial={{ opacity: 0.35, y: 16, scale: 0.96 }}
            animate={{
              opacity: showAfter ? 1 : isTransition ? 0.55 : 0.35,
              y: 0,
              scale: showAfter ? 1 : 0.96,
            }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="flex w-full justify-center sm:flex-1"
          >
            <PhoneMockup
              label="Après Anyloc"
              location={destination.city}
              sublocation={destination.area}
              variant="after"
              appLabel={useCase.mapLabel}
              pinClass={useCase.pinColor}
            />
          </motion.div>
        </div>
      )}

      {isReady && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: showAfter ? 1 : 0 }}
          transition={{ duration: 0.55 }}
          className="mt-6 px-1 text-center text-sm text-zinc-600 sm:mt-8"
        >
          {personalizedCopy ? (
            <>
              Sur {useCase.appName}, tes potes verront{" "}
              <strong className="text-zinc-700">{currentLocation.city}</strong> →{" "}
              <strong className="text-pink-600">
                {destination.emoji} {destination.city}
              </strong>
              .
            </>
          ) : (
            <>
              Sur {useCase.appName}, ton pin GPS affichera{" "}
              <strong className="text-pink-600">
                {destination.emoji} {destination.city}
              </strong>{" "}
              — comme si tu étais vraiment sur place.
            </>
          )}
        </motion.p>
      )}

      <Button
        className="mt-6 h-14 w-full text-base sm:mt-8"
        onClick={onContinue}
        disabled={!canContinue}
      >
        Voir le signal GPS en action
        <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
