import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      title="Crée ton compte"
      description="3 jours gratuits — email et mot de passe suffisent."
    >
      <SignupForm />
    </AuthShell>
  );
}
