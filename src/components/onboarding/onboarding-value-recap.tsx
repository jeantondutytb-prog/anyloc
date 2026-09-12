"use client";

import { ArrowRight, Check, Sparkles, Star, Zap } from "lucide-react";
import { CHECKOUT_PERKS } from "@/lib/constants";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import { getDestinationSocialProof } from "@/lib/onboarding-social-proof";
import type { OnboardingUseCase } from "@/lib/onboarding-use-cases";
import { Button } from "@/components/ui/button";

export function OnboardingValueRecap({
  useCase,
  destination,
  onContinue,
}: {
  useCase: OnboardingUseCase;
  destination: OnboardingDestination;
  onContinue: () => void;
}) {
  const socialProof = getDestinationSocialProof(destination);

  const personalizedPerks = [
    `Ta loc à ${destination.city} pour ${useCase.appName}`,
    ...CHECKOUT_PERKS.slice(0, 4),
  ];

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-8 text-center">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-pink-600">
          <Sparkles className="h-4 w-4" />
          Étape 5
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Ton pack{" "}
          <span className="gradient-text">{destination.city}</span> est prêt
        </h1>
        <p className="mt-3 text-zinc-500">
          Plus qu&apos;une étape pour activer ta fausse position.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl">
        <div className="bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-4 text-center text-white">
          <span className="text-3xl">{destination.emoji}</span>
          <p className="mt-1 text-lg font-bold">{destination.city}</p>
          <p className="text-sm text-white/80">{destination.area}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-white/70">
            {useCase.emoji} {useCase.label}
          </p>
        </div>

        <ul className="space-y-3 p-5 sm:p-6">
          {personalizedPerks.map((perk) => (
            <li key={perk} className="flex items-start gap-3 text-sm text-zinc-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-100">
                <Check className="h-3 w-3 text-pink-600" />
              </span>
              {perk}
            </li>
          ))}
        </ul>

        <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-4 sm:px-6">
          <p className="text-center text-xs text-zinc-500">
            {socialProof.weeklyLabel}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-pink-500" />
              Accès instantané
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-pink-500" />
              Garantie 48 h
            </span>
          </div>
        </div>
      </div>

      <Button className="mt-8 h-14 w-full text-base" onClick={onContinue}>
        Choisir ma formule
        <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
