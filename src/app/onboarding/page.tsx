import { OnboardingTwoStepView } from "@/components/onboarding/onboarding-two-step-view";
import { getVisitorLocation } from "@/lib/visitor-location";

export const metadata = {
  title: "Onboarding — Anyloc",
  description:
    "Choisis ta destination, prévisualise ta fausse position et active Anyloc.",
};

export default async function OnboardingPage() {
  // The step-2 pin starts where the visitor is (city from their IP).
  const visitorLocation = await getVisitorLocation();

  return <OnboardingTwoStepView visitorLocation={visitorLocation} />;
}
