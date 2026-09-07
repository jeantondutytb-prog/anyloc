import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      mode="signup"
      title="Commence l'essai gratuit"
      description="3 jours offerts — email et mot de passe suffisent pour démarrer."
    >
      <SignupForm />
    </AuthShell>
  );
}
