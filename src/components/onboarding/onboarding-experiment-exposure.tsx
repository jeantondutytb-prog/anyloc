"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";
import type { OnboardingVariant } from "@/lib/onboarding-experiment";
import { registerPostHogProperties } from "@/lib/posthog/browser";

/**
 * Records which onboarding this visitor gets, so signups and purchases can be
 * broken down by it; onboarding_experiment_exposed marks exposure. Mounted on
 * the first page of each flow: /onboarding (control), signup before /app.
 */
export function OnboardingExperimentExposure({ variant }: { variant: OnboardingVariant }) {
  useEffect(() => {
    registerPostHogProperties({ onboarding_variant: variant });
    track("onboarding_experiment_exposed", { onboarding_variant: variant });
  }, [variant]);

  return null;
}
