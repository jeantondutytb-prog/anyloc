import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingActivationNotice } from "@/components/auth/onboarding-activation-notice";
import { SignupForm } from "@/components/auth/signup-form";
import { OnboardingExperimentExposure } from "@/components/onboarding/onboarding-experiment-exposure";
import { DEFAULT_PLAN_ID, getCheckoutUrl, isValidPlanId } from "@/lib/constants";
import { isOnboardingQuizPath } from "@/lib/onboarding-experiment";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; next?: string; redirectTo?: string }>;
}) {
  const { plan, next, redirectTo: redirectToParam } = await searchParams;
  const planId = isValidPlanId(plan) ? plan! : DEFAULT_PLAN_ID;
  const redirectTo = sanitizeRedirectPath(
    next ?? redirectToParam,
    getCheckoutUrl(planId)
  );
  // The quiz half of the onboarding A/B test signs up before anything else.
  const beforeQuiz = isOnboardingQuizPath(redirectTo);

  return (
    <AuthShell
      notice={
        beforeQuiz ? (
          <p className="mb-3 text-sm font-semibold text-pink-600">Ta loc est prête en 2 minutes</p>
        ) : (
          <OnboardingActivationNotice action="signup" />
        )
      }
      title="Crée ton compte"
      description={
        beforeQuiz
          ? "On prépare ta fausse loc juste après."
          : "Email et mot de passe suffisent pour choisir ta destination."
      }
    >
      {beforeQuiz ? <OnboardingExperimentExposure variant="quiz" /> : null}
      <SignupForm plan={planId} redirectTo={redirectTo} />
    </AuthShell>
  );
}
