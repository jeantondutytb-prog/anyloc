"use client";

import { AnyLocCheckoutPanel } from "@/components/pricing/anyloc-checkout-panel";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";

export function PaywallCheckoutPanel({
  selectedPlanId,
  onPlanChange,
  stripePublishableKey,
  destination,
  googleAuthRedirectTo,
  onBack,
  canceled,
  checkoutTitle: _checkoutTitle,
  checkoutSubtitle: _checkoutSubtitle,
}: {
  selectedPlanId: string;
  onPlanChange: (planId: string) => void;
  stripePublishableKey: string;
  destination?: OnboardingDestination;
  googleAuthRedirectTo?: string;
  onBack?: () => void;
  canceled?: boolean;
  checkoutTitle?: string;
  checkoutSubtitle?: string;
}) {
  return (
    <AnyLocCheckoutPanel
      selectedPlanId={selectedPlanId}
      onPlanChange={onPlanChange}
      stripePublishableKey={stripePublishableKey}
      destination={destination}
      googleAuthRedirectTo={googleAuthRedirectTo}
      onBack={onBack}
      canceled={canceled}
    />
  );
}
