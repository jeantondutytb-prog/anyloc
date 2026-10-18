"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";
import type { CheckoutButtonVariant } from "@/lib/checkout-button-experiment";
import { registerPostHogProperties } from "@/lib/posthog/browser";

/**
 * Records which payment button this visitor sees, so checkout and purchase
 * events can be broken down by it; checkout_button_experiment_exposed marks exposure.
 */
export function CheckoutButtonExperimentExposure({ variant }: { variant: CheckoutButtonVariant }) {
  useEffect(() => {
    registerPostHogProperties({ checkout_button_variant: variant });
    track("checkout_button_experiment_exposed", { checkout_button_variant: variant });
  }, [variant]);

  return null;
}
