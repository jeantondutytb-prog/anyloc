"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";
import { setAmplitudeUserProperties } from "@/lib/amplitude/browser";
import type { OnboardingVariant } from "@/lib/onboarding-experiment";
import { registerPostHogProperties } from "@/lib/posthog/browser";

/**
 * Records which onboarding this visitor sees. Rendered before the onboarding
 * so its events (step viewed, completed…) already carry the variant, and so
 * do signup, checkout and purchase events afterwards.
 */
export function OnboardingExperimentExposure({ variant }: { variant: OnboardingVariant }) {
  useEffect(() => {
    registerPostHogProperties({ onboarding_variant: variant });
    void setAmplitudeUserProperties({ onboarding_variant: variant });
    track("onboarding_experiment_exposed", { onboarding_variant: variant });
  }, [variant]);

  return null;
}
