"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { requestPasswordReset, type PasswordResetState } from "@/app/auth/password-reset-actions";
import { AuthInput } from "@/components/auth/auth-input";
import { Button } from "@/components/ui/button";

const initialState: PasswordResetState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <div>
      {state.notice ? (
        <div
          role="status"
          className="rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm text-pink-700"
        >
          {state.notice}
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          {state.error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {state.error}
            </div>
          ) : null}

          <AuthInput
            id="email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            required
            placeholder="toi@email.com"
          />

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi…
              </>
            ) : (
              "Recevoir le lien"
            )}
          </Button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-zinc-500">
        <Link href="/login" className="font-medium text-pink-600 hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
