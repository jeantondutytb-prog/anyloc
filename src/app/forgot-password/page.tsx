import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Mot de passe oublié"
      description="Donne l'email de ton compte : on t'envoie un lien pour choisir un nouveau mot de passe."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
