import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingActivationNotice } from "@/components/auth/onboarding-activation-notice";
import { LoginForm } from "@/components/auth/login-form";
import { isValidPlanId } from "@/lib/constants";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string;
    next?: string;
    redirectTo?: string;
    checkout?: string;
    error?: string;
  }>;
}) {
  const { plan, next, redirectTo: redirectToParam, checkout, error } =
    await searchParams;
  const planId = isValidPlanId(plan) ? plan! : "annual";
  const redirectTo = sanitizeRedirectPath(
    next ?? redirectToParam,
    "/dashboard"
  );

  return (
    <AuthShell
      notice={<OnboardingActivationNotice action="login" />}
      title="Connexion"
      description="Connecte-toi pour accéder à ton dashboard et gérer ta position GPS."
    >
      {error === "oauth" ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          La connexion Google a échoué. Réessaie, ou utilise email et mot de
          passe.
        </div>
      ) : null}
      {checkout === "email-sent" ? (
        <div
          role="status"
          className="mb-4 rounded-xl border border-pink-500/30 bg-pink-500/10 px-4 py-3 text-sm text-[#F472B6]"
        >
          Paiement confirmé ! On t&apos;a envoyé un lien de connexion par
          email pour accéder à ton compte.
        </div>
      ) : null}
      <LoginForm plan={planId} redirectTo={redirectTo} />
    </AuthShell>
  );
}
