import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCheckoutUrl, isValidPlanId } from "@/lib/constants";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; next?: string; redirectTo?: string }>;
}) {
  const { plan, next, redirectTo: redirectToParam } = await searchParams;
  const planId = isValidPlanId(plan) ? plan! : "annual";
  const redirectTo = next ?? redirectToParam ?? getCheckoutUrl(planId);

  return (
    <AuthShell
      title="Connexion"
      description="Entre ton email et ton mot de passe pour finaliser ton abonnement."
    >
      <LoginForm plan={planId} redirectTo={redirectTo} />
    </AuthShell>
  );
}
