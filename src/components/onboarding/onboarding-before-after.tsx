"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, MapPin, Sparkles } from "lucide-react";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import type { OnboardingUseCase } from "@/lib/onboarding-use-cases";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AnimationPhase = "before" | "transition" | "after";

const BEFORE_HOLD_MS = 1400;
const TRANSITION_MS = 1600;

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
    <div className="flex flex-col items-center">
      <p
        className={cn(
          "mb-3 text-xs font-semibold uppercase tracking-wider",
          isAfter ? "text-pink-600" : "text-zinc-400"
        )}
      >
        {label}
      </p>
      <div
        className={cn(
          "w-full max-w-[200px] overflow-hidden rounded-[1.75rem] border-4 shadow-lg transition-shadow duration-700",
          isAfter
            ? "border-pink-400 bg-gradient-to-b from-pink-50 to-white shadow-pink-200/40"
            : "border-zinc-300 bg-zinc-50"
        )}
      >
        <div className="bg-zinc-900 px-4 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            {appLabel}
          </p>
        </div>
        <div className="relative aspect-[9/14] bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-50 p-3">
          <div className="absolute inset-3 rounded-xl bg-white/60 backdrop-blur-sm" />
          <div className="relative flex h-full flex-col items-center justify-center gap-2 p-2">
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
                      duration: pulse ? 1.4 : 0.6,
                      repeat: pulse ? Infinity : 0,
                      ease: "easeInOut",
                    }
                  : {}
              }
            >
              <MapPin
                className={cn(
                  "h-8 w-8",
                  isAfter ? pinClass : "text-zinc-400"
                )}
              />
            </motion.div>
            <p
              className={cn(
                "text-center text-sm font-bold",
                isAfter ? "text-zinc-900" : "text-zinc-500"
              )}
            >
              {location}
            </p>
            <p className="text-center text-[11px] text-zinc-500">{sublocation}</p>
          </div>
        </div>
      </div>
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
  const [phase, setPhase] = useState<AnimationPhase>("before");
  const [currentLocation, setCurrentLocation] = useState({
    city: "Chez toi",
    area: "Position réelle",
    resolved: false,
  });

  useEffect(() => {
    const controller = new AbortController();

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
        if (!data?.city) {
          return;
        }

        setCurrentLocation({
          city: data.city,
          area: data.area ?? "Position réelle",
          resolved: data.found === true,
        });
      })
      .catch(() => {
        // Keep fallback labels.
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    setPhase("before");

    const transitionTimer = window.setTimeout(
      () => setPhase("transition"),
      BEFORE_HOLD_MS
    );
    const afterTimer = window.setTimeout(
      () => setPhase("after"),
      BEFORE_HOLD_MS + TRANSITION_MS
    );

    return () => {
      window.clearTimeout(transitionTimer);
      window.clearTimeout(afterTimer);
    };
  }, [destination.id, useCase.id]);

  const showAfter = phase === "after";
  const isTransition = phase === "transition";
  const personalizedCopy = currentLocation.resolved;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8 text-center">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-pink-600">
          <Sparkles className="h-4 w-4" />
          Étape 3
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Voilà ce que tes potes verront sur{" "}
          <span className="gradient-text">{useCase.appName}</span>
        </h1>
        <p className="mt-3 text-zinc-500">
          {personalizedCopy
            ? `De ${currentLocation.city} à ${destination.city} — en un clic.`
            : "Avant / après — même app, nouvelle ville en un clic."}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 sm:gap-8">
        <motion.div
          key={`before-${destination.id}-${currentLocation.city}`}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="flex-1"
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

        <div className="flex shrink-0 flex-col items-center gap-2">
          <motion.div
            animate={{
              opacity: showAfter ? 1 : isTransition ? 1 : 0.45,
              scale: isTransition ? [1, 1.12, 1] : showAfter ? 1 : 0.92,
              x: isTransition ? [0, 4, 0] : 0,
            }}
            transition={
              isTransition
                ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.4 }
            }
          >
            <ArrowRight className="h-6 w-6 text-pink-400 sm:h-8 sm:w-8" />
          </motion.div>

          <AnimatePresence mode="wait">
            {isTransition && (
              <motion.p
                key="transition-label"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-1 text-[10px] font-medium text-pink-600"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                Téléportation…
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          key={`after-${destination.id}-${showAfter}`}
          initial={{ opacity: 0.35, x: 24, scale: 0.96 }}
          animate={{
            opacity: showAfter ? 1 : isTransition ? 0.55 : 0.35,
            x: 0,
            scale: showAfter ? 1 : 0.96,
          }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="flex-1"
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

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: showAfter ? 1 : 0 }}
        transition={{ duration: 0.45 }}
        className="mt-8 text-center text-sm text-zinc-600"
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

      <Button
        className="mt-8 h-14 w-full text-base"
        onClick={onContinue}
        disabled={!showAfter}
      >
        Voir le signal GPS en action
        <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
