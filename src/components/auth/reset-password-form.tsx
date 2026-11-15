"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { resetPassword, type PasswordResetState } from "@/app/auth/password-reset-actions";
import { AuthPasswordInput } from "@/components/auth/auth-input";
import { Button } from "@/components/ui/button";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

const initialState: PasswordResetState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}{" "}
          <Link href="/forgot-password" className="font-medium underline">
            Nouveau lien
          </Link>
        </div>
      ) : null}

      <AuthPasswordInput
        id="password"
        name="password"
        label="Nouveau mot de passe"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        placeholder={`${MIN_PASSWORD_LENGTH} caractères minimum`}
        showPassword={showPassword}
        onToggle={() => setShowPassword((value) => !value)}
      />

      <AuthPasswordInput
        id="confirmPassword"
        name="confirmPassword"
        label="Confirme le mot de passe"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        placeholder="••••••••"
        showPassword={showPassword}
        onToggle={() => setShowPassword((value) => !value)}
      />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enregistrement…
          </>
        ) : (
          "Enregistrer et me connecter"
        )}
      </Button>
    </form>
  );
}
