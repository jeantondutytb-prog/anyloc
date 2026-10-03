"use client";

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics/track";
import {
  OnboardingAppSandbox,
  type LockedFeature,
  type SelectionSource,
} from "@/components/onboarding/onboarding-app-sandbox";
import {
  CIRCLE_REVEAL_MS,
  CircleReveal,
  type CircleRevealOrigin,
} from "@/components/ui/circle-reveal";
import { Logo } from "@/components/ui/logo";
import { DEFAULT_PLAN_ID, getPostOnboardingSignupUrl, isValidPlanId } from "@/lib/constants";
import {
  ONBOARDING_ACTIVATION_PENDING_KEY,
  ONBOARDING_DESTINATION_KEY,
  type OnboardingDestination,
} from "@/lib/onboarding-destinations";

function subscribeToNothing() {
  return () => {};
}

/** Destination picked earlier in this tab (e.g. coming back from signup). */
function useStoredDestination() {
  const raw = useSyncExternalStore(
    subscribeToNothing,
    () => {
      try {
        return window.sessionStorage.getItem(ONBOARDING_DESTINATION_KEY);
      } catch {
        return null;
      }
    },
    () => null
  );

  return useMemo(() => {
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as OnboardingDestination;
    } catch {
      return null;
    }
  }, [raw]);
}

function persistDestination(destination: OnboardingDestination) {
  try {
    window.sessionStorage.setItem(ONBOARDING_DESTINATION_KEY, JSON.stringify(destination));
  } catch {
    // Storage can be unavailable (private mode); the flow still works.
  }
}

function OnboardingViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storedDestination = useStoredDestination();
  const [leavingFrom, setLeavingFrom] = useState<CircleRevealOrigin | null>(null);
  const selectedPlanId = useMemo(() => {
    const plan = searchParams.get("plan") ?? undefined;
    if (isValidPlanId(plan)) {
      return plan!;
    }
    return DEFAULT_PLAN_ID;
  }, [searchParams]);
  const signupUrl = getPostOnboardingSignupUrl(selectedPlanId);

  useEffect(() => {
    // Old links to the removed trial steps go straight to signup.
    const stepParam = searchParams.get("step");
    if (stepParam === "3" || stepParam === "6") {
      router.replace(signupUrl);
    }
  }, [router, searchParams, signupUrl]);

  useEffect(() => {
    track("onboarding_step_viewed", { step: 1, step_name: "app_sandbox" });
    // Signup is the only way forward: load it early so the hand-off is instant.
    router.prefetch(signupUrl);
  }, [router, signupUrl]);

  function handleSelect(destination: OnboardingDestination, source: SelectionSource) {
    persistDestination(destination);
    track("onboarding_destination_selected", {
      source,
      destination_city: destination.city,
    });
  }

  function handleLockedClick(feature: LockedFeature) {
    track("onboarding_preview_locked_click", { feature });
  }

  function handleSetPosition(destination: OnboardingDestination, origin: CircleRevealOrigin) {
    if (leavingFrom) {
      return;
    }
    persistDestination(destination);
    try {
      window.sessionStorage.setItem(ONBOARDING_ACTIVATION_PENDING_KEY, "1");
    } catch {}
    track("onboarding_completed", {
      destination_city: destination.city,
      plan: selectedPlanId,
    });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(signupUrl);
      return;
    }
    // Mirror of the landing → app transition: the light site grows back from
    // the button, then signup (light) appears on the same color.
    setLeavingFrom(origin);
    window.setTimeout(() => router.push(signupUrl), CIRCLE_REVEAL_MS * 0.75);
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#0A0A0C] sm:flex sm:flex-col sm:items-center sm:justify-center sm:bg-background sm:px-6 sm:py-8">
      <div className="sm:flex sm:flex-col sm:items-center">
        <div className="mb-6 hidden text-center sm:block">
          <Logo href="/" size="sm" className="justify-center" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 lg:text-3xl">
            Essaie Anyloc : <span className="gradient-text">choisis où tu veux être</span>
          </h1>
        </div>

        <div className="relative h-dvh w-full sm:h-[min(820px,calc(100dvh-150px))] sm:w-[400px] sm:overflow-hidden sm:rounded-[44px] sm:shadow-2xl sm:shadow-pink-500/20 sm:ring-[10px] sm:ring-zinc-900">
          <OnboardingAppSandbox
            // Remount once the stored pick is readable on the client.
            key={storedDestination ? "restored" : "fresh"}
            initialDestination={storedDestination}
            onSelect={handleSelect}
            onLockedClick={handleLockedClick}
            onSetPosition={handleSetPosition}
          />
        </div>
      </div>

      {leavingFrom && <CircleReveal origin={leavingFrom} color="var(--background)" />}
    </div>
  );
}

/** Variant "app_sandbox" of the onboarding A/B test: a working replica of the app. */
export function OnboardingSandboxView() {
  return (
    <Suspense
      // Same backdrop as the reveal from the landing CTA, so nothing flashes.
      fallback={<div className="min-h-dvh bg-[#0A0A0C] sm:bg-background" />}
    >
      <OnboardingViewContent />
    </Suspense>
  );
}
