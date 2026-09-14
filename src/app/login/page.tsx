import { AuthShell } from "@/components/auth/auth-shell";
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
  }>;
}) {
  const { plan, next, redirectTo: redirectToParam, checkout } =
    await searchParams;
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
      {checkout === "email-sent" ? (
        <div
          role="status"
          className="mb-4 rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm text-pink-700"
        >
          Paiement confirmé ! On t&apos;a envoyé un lien de connexion par
          email pour accéder à ton compte.
        </div>
      ) : null}
      <LoginForm plan={planId} redirectTo={redirectTo} />
    </AuthShell>
  );
}
