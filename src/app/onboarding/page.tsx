import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingExperimentExposure } from "@/components/onboarding/onboarding-experiment-exposure";
import { OnboardingTwoStepView } from "@/components/onboarding/onboarding-two-step-view";
import { DEFAULT_PLAN_ID, isValidPlanId } from "@/lib/constants";
import {
  getEffectiveOnboardingVariant,
  getOnboardingQuizUrl,
  getQuizSignupUrl,
  isOnboardingExperimentEnabled,
  ONBOARDING_VARIANT_COOKIE,
} from "@/lib/onboarding-experiment";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getVisitorLocation } from "@/lib/visitor-location";

export const metadata = {
  title: "Onboarding — Anyloc",
  description:
    "Choisis ta destination, prévisualise ta fausse position et active Anyloc.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const planId = isValidPlanId(plan) ? plan! : DEFAULT_PLAN_ID;

  // A/B test: the quiz half signs up first (see lib/onboarding-experiment).
  const variant = getEffectiveOnboardingVariant(
    (await cookies()).get(ONBOARDING_VARIANT_COOKIE)?.value
  );
  if (variant === "quiz") {
    let signedIn = false;
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      signedIn = Boolean(user);
    }
    redirect(signedIn ? getOnboardingQuizUrl(planId) : getQuizSignupUrl(planId));
  }

  // The step-2 pin starts where the visitor is (city from their IP).
  const visitorLocation = await getVisitorLocation();
  return (
    <>
      {isOnboardingExperimentEnabled() ? <OnboardingExperimentExposure variant="control" /> : null}
      <OnboardingTwoStepView visitorLocation={visitorLocation} />
    </>
  );
}
