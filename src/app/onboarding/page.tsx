import { OnboardingView } from "@/components/onboarding/onboarding-view";
import { getStripePublishableKey } from "@/lib/stripe-client";

export const metadata = {
  title: "Onboarding — Anyloc",
  description:
    "Choisis ta destination, prévisualise ta fausse position et active Anyloc.",
};

export default function OnboardingPage() {
  return (
    <OnboardingView stripePublishableKey={getStripePublishableKey()} />
  );
}
