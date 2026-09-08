import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      title="Crée ton compte"
      description="Email et mot de passe suffisent."
    >
      <SignupForm />
    </AuthShell>
  );
}
