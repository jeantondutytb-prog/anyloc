import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingActivationNotice } from "@/components/auth/onboarding-activation-notice";
import { SignupForm } from "@/components/auth/signup-form";
import { getCheckoutUrl, isValidPlanId } from "@/lib/constants";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; next?: string; redirectTo?: string }>;
}) {
  const { plan, next, redirectTo: redirectToParam } = await searchParams;
  const planId = isValidPlanId(plan) ? plan! : "annual";
  const redirectTo = sanitizeRedirectPath(
    next ?? redirectToParam,
    getCheckoutUrl(planId)
  );

  return (
    <AuthShell
      notice={<OnboardingActivationNotice action="signup" />}
      title="Crée ton compte"
      description="Email et mot de passe suffisent pour choisir ta destination."
    >
      <SignupForm plan={planId} redirectTo={redirectTo} />
    </AuthShell>
  );
}
