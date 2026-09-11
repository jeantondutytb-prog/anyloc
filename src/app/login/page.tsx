import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCheckoutUrl, isValidPlanId } from "@/lib/constants";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; next?: string; redirectTo?: string }>;
}) {
  const { plan, next, redirectTo: redirectToParam } = await searchParams;
  const planId = isValidPlanId(plan) ? plan! : "annual";
  const redirectTo = sanitizeRedirectPath(
    next ?? redirectToParam,
    "/dashboard"
  );

  return (
    <AuthShell
      title="Connexion"
      description="Connecte-toi pour accéder à ton dashboard et gérer ta position GPS."
    >
      <LoginForm plan={planId} redirectTo={redirectTo} />
    </AuthShell>
  );
}
