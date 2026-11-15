"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";
import type { PriceDisplayVariant } from "@/lib/price-display-experiment";
import { registerPostHogProperties } from "@/lib/posthog/browser";

/**
 * Records how this visitor sees the checkout prices, so checkout and purchase
 * events can be broken down by it; price_display_experiment_exposed marks exposure.
 */
export function PriceDisplayExperimentExposure({ variant }: { variant: PriceDisplayVariant }) {
  useEffect(() => {
    registerPostHogProperties({ price_display_variant: variant });
    track("price_display_experiment_exposed", {
      price_display_variant: variant,
      $set: { price_display_variant: variant },
    });
  }, [variant]);

  return null;
}
