import { cookies } from "next/headers";
import { OnboardingExperimentExposure } from "@/components/onboarding/onboarding-experiment-exposure";
import { OnboardingTwoStepView } from "@/components/onboarding/onboarding-two-step-view";
import {
  getEffectiveOnboardingVariant,
  isOnboardingExperimentEnabled,
  ONBOARDING_VARIANT_COOKIE,
} from "@/lib/onboarding-experiment";
import { getVisitorLocation } from "@/lib/visitor-location";

export const metadata = {
  title: "Onboarding — Anyloc",
  description:
    "Choisis ta destination, prévisualise ta fausse position et active Anyloc.",
};

export default async function OnboardingPage() {
  // A/B test: the questions half signs up, then answers the quiz (see lib/onboarding-experiment).
  const variant = getEffectiveOnboardingVariant(
    (await cookies()).get(ONBOARDING_VARIANT_COOKIE)?.value
  );

  // The step-2 pin starts where the visitor is (city from their IP).
  const visitorLocation = await getVisitorLocation();
  return (
    <>
      {isOnboardingExperimentEnabled() ? <OnboardingExperimentExposure variant={variant} /> : null}
      <OnboardingTwoStepView visitorLocation={visitorLocation} onboardingVariant={variant} />
    </>
  );
}
