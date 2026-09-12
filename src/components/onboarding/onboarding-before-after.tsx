"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import type { OnboardingUseCase } from "@/lib/onboarding-use-cases";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function PhoneMockup({
  label,
  location,
  sublocation,
  variant,
  appLabel,
  pinClass,
}: {
  label: string;
  location: string;
  sublocation: string;
  variant: "before" | "after";
  appLabel: string;
  pinClass: string;
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
          "w-full max-w-[200px] overflow-hidden rounded-[1.75rem] border-4 shadow-lg",
          isAfter
            ? "border-pink-400 bg-gradient-to-b from-pink-50 to-white"
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
              animate={isAfter ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.6, delay: isAfter ? 0.3 : 0 }}
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
  const [showAfter, setShowAfter] = useState(false);

  useEffect(() => {
    setShowAfter(false);
    const timer = window.setTimeout(() => setShowAfter(true), 1200);
    return () => window.clearTimeout(timer);
  }, [destination.id, useCase.id]);

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
          Avant / après — même app, nouvelle ville en un clic.
        </p>
      </div>

      <div className="flex items-center justify-center gap-4 sm:gap-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`before-${destination.id}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            <PhoneMockup
              label="Avant"
              location="Chez toi"
              sublocation="Position réelle"
              variant="before"
              appLabel={useCase.mapLabel}
              pinClass={useCase.pinColor}
            />
          </motion.div>
        </AnimatePresence>

        <motion.div
          animate={{ opacity: showAfter ? 1 : 0.3, scale: showAfter ? 1 : 0.9 }}
          className="shrink-0"
        >
          <ArrowRight className="h-6 w-6 text-pink-400 sm:h-8 sm:w-8" />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`after-${destination.id}-${showAfter}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: showAfter ? 1 : 0.4, x: 0 }}
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
        </AnimatePresence>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: showAfter ? 1 : 0 }}
        className="mt-8 text-center text-sm text-zinc-600"
      >
        Sur {useCase.appName}, ton pin GPS affichera{" "}
        <strong className="text-pink-600">
          {destination.emoji} {destination.city}
        </strong>{" "}
        — comme si tu étais vraiment sur place.
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
