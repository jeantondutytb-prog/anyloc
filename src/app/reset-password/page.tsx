import Link from "next/link";
import { cookies } from "next/headers";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { isPlausibleTokenHash, PASSWORD_RESET_EXPIRED_ERROR, RESET_TOKEN_COOKIE } from "@/lib/password-reset";

export default async function ResetPasswordPage() {
  const hasToken = isPlausibleTokenHash((await cookies()).get(RESET_TOKEN_COOKIE)?.value);

  return (
    <AuthShell title="Nouveau mot de passe" description="Choisis ton nouveau mot de passe Anyloc.">
      {hasToken ? (
        <ResetPasswordForm />
      ) : (
        <div className="space-y-4">
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {PASSWORD_RESET_EXPIRED_ERROR}
          </div>
          <p className="text-center text-sm">
            <Link href="/forgot-password" className="font-medium text-pink-600 hover:underline">
              Recevoir un nouveau lien
            </Link>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
