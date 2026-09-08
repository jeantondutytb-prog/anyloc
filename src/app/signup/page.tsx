import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { isValidPlanId } from "@/lib/constants";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const planId = isValidPlanId(plan) ? plan! : "annual";

  return (
    <AuthShell
      title="Crée ton compte"
      description="Email et mot de passe suffisent pour continuer vers le paiement."
    >
      <SignupForm plan={planId} />
    </AuthShell>
  );
}
