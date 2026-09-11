import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { isValidPlanId, getCheckoutUrl } from "@/lib/constants";
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
      title="Crée ton compte"
      description="Email et mot de passe suffisent pour continuer vers le paiement."
    >
      <SignupForm plan={planId} redirectTo={redirectTo} />
    </AuthShell>
  );
}
