import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Connexion"
      description="Entre ton email et ton mot de passe pour accéder à ton espace."
    >
      <LoginForm />
    </AuthShell>
  );
}
