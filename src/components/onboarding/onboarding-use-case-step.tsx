"use client";

import { ChevronRight, Sparkles } from "lucide-react";
import {
  ONBOARDING_USE_CASES,
  type OnboardingUseCase,
} from "@/lib/onboarding-use-cases";
import { cn } from "@/lib/utils";

function UseCaseCard({
  useCase,
  onSelect,
}: {
  useCase: OnboardingUseCase;
  onSelect: (useCase: OnboardingUseCase) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(useCase)}
      className="group flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-left shadow-sm transition-all hover:border-pink-300 hover:shadow-md"
    >
      <span className="text-2xl">{useCase.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-zinc-900">{useCase.label}</p>
        <p className="truncate text-sm text-zinc-500">{useCase.description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export function OnboardingUseCaseStep({
  onSelect,
}: {
  onSelect: (useCase: OnboardingUseCase) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8 text-center">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-pink-600">
          <Sparkles className="h-4 w-4" />
          Étape 1
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          Tu veux faker ta loc pour{" "}
          <span className="gradient-text">quoi</span> ?
        </h1>
        <p className="mt-3 text-sm text-zinc-500 sm:text-base">
          On personnalise la suite selon ton usage — Snap, Insta, rencontres…
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ONBOARDING_USE_CASES.map((useCase) => (
          <UseCaseCard key={useCase.id} useCase={useCase} onSelect={onSelect} />
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-zinc-400">
        Anyloc modifie le GPS de tout ton tel — une loc pour toutes tes apps.
      </p>
    </div>
  );
}
