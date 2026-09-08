"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_ONBOARDING_STATE,
  isOnboardingComplete,
  PAYMENT_SUCCESS_SESSION_KEY,
  readOnboardingState,
  type OnboardingState,
  type OnboardingSteps,
  writeOnboardingState,
} from "@/lib/dashboard-onboarding";

export function useDashboardOnboarding() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);
  const [showWelcome, setShowWelcome] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readOnboardingState();
    setState(stored);
    setHydrated(true);

    const urlSuccess =
      searchParams.get("success") === "true" ||
      new URLSearchParams(window.location.search).get("success") === "true";
    const sessionSuccess =
      window.sessionStorage.getItem(PAYMENT_SUCCESS_SESSION_KEY) === "true";
    const success = urlSuccess || sessionSuccess;

    if (urlSuccess) {
      window.sessionStorage.setItem(PAYMENT_SUCCESS_SESSION_KEY, "true");
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname + url.search);
    }

    setPaymentSuccess(success);

    if (success || !stored.welcomeDismissed) {
      setShowWelcome(true);
    }
  }, [searchParams]);

  const persist = useCallback((next: OnboardingState) => {
    setState(next);
    writeOnboardingState(next);
  }, []);

  const dismissWelcome = useCallback(() => {
    setState((current) => {
      const next = {
        ...current,
        welcomeDismissed: true,
      };
      writeOnboardingState(next);
      return next;
    });
    setShowWelcome(false);
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
    setShowWelcome(true);
  }, [persist]);

  return {
    hydrated,
    state,
    showWelcome,
    paymentSuccess,
    dismissWelcome,
    completeStep,
    resetOnboarding,
    isComplete: isOnboardingComplete(state.steps),
    showChecklist: hydrated && !isOnboardingComplete(state.steps),
    showMap: hydrated && state.steps.install,
  };
}
