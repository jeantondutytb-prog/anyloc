import { redirect } from "next/navigation";
import { OnboardingQuizView } from "@/components/onboarding/onboarding-quiz-view";
import { DEFAULT_PLAN_ID, isValidPlanId } from "@/lib/constants";
import { getQuizSignupUrl } from "@/lib/onboarding-experiment";
import { getSubscriptionAccessForUser } from "@/lib/subscription";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getVisitorLocation } from "@/lib/visitor-location";

export const metadata = {
  title: "Ta loc — Anyloc",
  description: "Choisis ta destination et prépare ta fausse position.",
  robots: { index: false },
};

/** B side of the onboarding A/B test: reached right after signup. */
export default async function OnboardingQuizPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const planId = isValidPlanId(plan) ? plan! : DEFAULT_PLAN_ID;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(getQuizSignupUrl(planId));
    }
    const access = await getSubscriptionAccessForUser(user.id, user.email);
    if (access.hasAccess) {
      redirect("/dashboard");
    }
  }

  // The teleport pin starts where the visitor is (city from their IP).
  const visitorLocation = await getVisitorLocation();
  return <OnboardingQuizView visitorLocation={visitorLocation} />;
}
