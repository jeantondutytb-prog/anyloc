import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { isValidPlanId } from "@/lib/constants";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; next?: string }>;
}) {
  const { plan, next } = await searchParams;
  const planId = isValidPlanId(plan) ? plan! : "annual";
  const redirectTo = next ?? "/dashboard";

  return (
    <AuthShell
      title="Connexion"
      description="Connecte-toi pour accéder à ton dashboard et gérer ta position GPS."
    >
      <LoginForm plan={planId} redirectTo={redirectTo} />
    </AuthShell>
  );
}
