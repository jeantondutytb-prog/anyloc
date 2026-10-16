"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";
import type { PricingVariant } from "@/lib/pricing-experiment";
import { registerPostHogProperties } from "@/lib/posthog/browser";

/**
 * Records which price grid this visitor sees, so checkout and purchase events
 * can be broken down by it; pricing_experiment_exposed marks exposure.
 */
export function PricingExperimentExposure({ variant }: { variant: PricingVariant }) {
  useEffect(() => {
    registerPostHogProperties({ pricing_variant: variant });
    track("pricing_experiment_exposed", { pricing_variant: variant });
  }, [variant]);

  return null;
}
