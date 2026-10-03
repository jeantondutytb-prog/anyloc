import { cookies } from "next/headers";
import { OnboardingExperimentExposure } from "@/components/onboarding/onboarding-experiment-exposure";
import { OnboardingSandboxView } from "@/components/onboarding/onboarding-sandbox-view";
import { OnboardingTwoStepView } from "@/components/onboarding/onboarding-two-step-view";
import {
  ONBOARDING_VARIANT_COOKIE,
  parseOnboardingVariant,
} from "@/lib/onboarding-experiment";

export const metadata = {
  title: "Onboarding — Anyloc",
  description:
    "Choisis ta destination, prévisualise ta fausse position et active Anyloc.",
};

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  // The proxy always sets the cookie; fall back to the current flow just in case.
  const variant =
    parseOnboardingVariant(cookieStore.get(ONBOARDING_VARIANT_COOKIE)?.value) ??
    "app_sandbox";

  return (
    <>
      <OnboardingExperimentExposure variant={variant} />
      {variant === "two_step" ? <OnboardingTwoStepView /> : <OnboardingSandboxView />}
    </>
  );
}
