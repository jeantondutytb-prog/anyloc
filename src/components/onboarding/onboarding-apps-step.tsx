"use client";

import { Check } from "lucide-react";
import {
  StepCta,
  StepHeader,
} from "@/components/onboarding/onboarding-step-layout";
import {
  ONBOARDING_USE_CASES,
  type OnboardingUseCaseId,
} from "@/lib/onboarding-use-cases";
import { cn } from "@/lib/utils";

export function OnboardingAppsStep({
  step,
  selected,
  onToggle,
  onContinue,
}: {
  step: number;
  selected: OnboardingUseCaseId[];
  onToggle: (id: OnboardingUseCaseId) => void;
  onContinue: () => void;
}) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl">
      <StepHeader
        step={step}
        title={
          <>
            Sur quelles <span className="gradient-text">apps</span> ?
          </>
        }
        subtitle="Choisis-en autant que tu veux. Anyloc les change toutes d'un coup."
      />

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        {ONBOARDING_USE_CASES.map((useCase) => {
          const isSelected = selected.includes(useCase.id);
          return (
            <button
              key={useCase.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(useCase.id)}
              className={cn(
                "flex w-full min-w-0 items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left shadow-sm transition-all",
                isSelected
                  ? "border-pink-400 ring-2 ring-pink-100"
                  : "border-zinc-200 hover:border-pink-300"
              )}
            >
              <span className="shrink-0 text-2xl">{useCase.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-zinc-900">{useCase.label}</p>
                <p className="line-clamp-2 text-sm text-zinc-500">{useCase.description}</p>
              </div>
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isSelected
                    ? "border-pink-500 bg-pink-500 text-white"
                    : "border-zinc-300 bg-white text-transparent"
                )}
              >
                <Check className="h-3.5 w-3.5" />
              </span>
            </button>
          );
        })}
      </div>

      <StepCta
        label={selected.length === 0 ? "Choisis au moins une app" : "Continuer"}
        onClick={onContinue}
        disabled={selected.length === 0}
      />
    </div>
  );
}
