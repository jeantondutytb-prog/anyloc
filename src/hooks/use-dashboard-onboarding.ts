"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_ONBOARDING_STATE,
  isOnboardingComplete,
  readOnboardingState,
  type OnboardingState,
  type OnboardingSteps,
  writeOnboardingState,
} from "@/lib/dashboard-onboarding";

export function useDashboardOnboarding() {
  const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readOnboardingState());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: OnboardingState) => {
    setState(next);
    writeOnboardingState(next);
  }, []);

  const completeStep = useCallback((step: keyof OnboardingSteps) => {
    setState((current) => {
      if (current.steps[step]) {
        return current;
      }

      const next = {
        ...current,
        steps: {
          ...current.steps,
          [step]: true,
        },
      };
      writeOnboardingState(next);
      return next;
    });
  }, []);

  const resetOnboarding = useCallback(() => {
    persist(DEFAULT_ONBOARDING_STATE);
  }, [persist]);

  return {
    hydrated,
    state,
    completeStep,
    resetOnboarding,
    isComplete: isOnboardingComplete(state.steps),
  };
}
