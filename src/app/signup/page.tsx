import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      title="Crée ton compte"
      description="3 jours gratuits pour explorer Anyloc — sans engagement, sans carte bancaire."
      footer={
        <p className="text-center text-sm text-zinc-500">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-pink-600 hover:underline">
            Se connecter
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
