import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Connexion"
      description="Retrouve ton espace et gère ta position GPS"
      footer={
        <p className="text-center text-sm text-zinc-500">
          Pas encore de compte ?{" "}
          <Link
            href="/signup"
            className="font-medium text-pink-600 hover:underline"
          >
            Créer un compte
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
