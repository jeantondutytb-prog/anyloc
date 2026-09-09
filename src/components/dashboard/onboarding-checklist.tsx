"use client";

import Link from "next/link";
import { ArrowRight, Check, Circle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ONBOARDING_STEP_ITEMS,
  type OnboardingSteps,
} from "@/lib/dashboard-onboarding";

type OnboardingChecklistProps = {
  steps: OnboardingSteps;
  onMarkInstallComplete: () => void;
};

export function OnboardingChecklist({
  steps,
  onMarkInstallComplete,
}: OnboardingChecklistProps) {
  const completedCount = Object.values(steps).filter(Boolean).length;
  const currentStep =
    ONBOARDING_STEP_ITEMS.find((item) => !steps[item.id]) ??
    ONBOARDING_STEP_ITEMS[ONBOARDING_STEP_ITEMS.length - 1];

  return (
    <Card className="border-pink-200 bg-gradient-to-br from-pink-50/80 to-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-pink-600">
            Guide de démarrage · {completedCount}/{ONBOARDING_STEP_ITEMS.length}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">
            Prochaine étape : {currentStep.title.toLowerCase()}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{currentStep.description}</p>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 sm:mt-2 sm:w-40">
          <div
            className="h-full rounded-full bg-pink-500 transition-all"
            style={{
              width: `${(completedCount / ONBOARDING_STEP_ITEMS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {ONBOARDING_STEP_ITEMS.map((item, index) => {
          const done = steps[item.id];
          const firstIncomplete = ONBOARDING_STEP_ITEMS.find(
            (step) => !steps[step.id]
          );
          const isCurrent = !done && item.id === firstIncomplete?.id;

          return (
            <li
              key={item.id}
              className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                done
                  ? "border-emerald-200 bg-emerald-50/60"
                  : isCurrent
                    ? "border-pink-300 bg-white shadow-sm"
                    : "border-zinc-200 bg-white/70"
              }`}
            >
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  done
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                      ? "bg-pink-500 text-white"
                      : "bg-zinc-200 text-zinc-500"
                }`}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3 w-3 fill-current" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    done ? "text-emerald-800" : "text-zinc-900"
                  }`}
                >
                  {index + 1}. {item.title}
                </p>
                {!done && (
                  <p className="mt-1 text-sm text-zinc-500">{item.description}</p>
                )}

                {item.id === "install" && !done && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Link href="/dashboard/installation" className="flex-1">
                      <Button size="sm" className="w-full">
                        <Smartphone className="h-4 w-4" />
                        Voir le guide
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={onMarkInstallComplete}
                    >
                      C&apos;est installé
                    </Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
