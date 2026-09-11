"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { signup, type AuthState } from "@/app/auth/actions";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthInput, AuthPasswordInput } from "@/components/auth/auth-input";
import { GoogleAuthLink } from "@/components/auth/google-auth-link";
import { Button } from "@/components/ui/button";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

const initialState: AuthState = {};

export function SignupForm({
  plan = "annual",
  redirectTo,
}: {
  plan?: string;
  redirectTo?: string;
}) {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const destination = redirectTo ?? `/checkout?plan=${plan}`;

  return (
    <div>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirectTo" value={destination} />
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

        <AuthPasswordInput
          id="password"
          name="password"
          label="Mot de passe"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          placeholder={`Au moins ${MIN_PASSWORD_LENGTH} caractères`}
          showPassword={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Création…
            </>
          ) : (
            "Créer mon compte"
          )}
        </Button>

        <p className="text-center text-xs leading-relaxed text-zinc-500">
          En créant un compte, tu acceptes nos{" "}
          <Link href="/conditions-generales" className="text-pink-600 hover:underline">
            conditions d&apos;utilisation
          </Link>
          .
        </p>
      </form>

      <AuthDivider />
      <GoogleAuthLink redirectTo={destination} />

      <p className="mt-4 text-center text-sm text-zinc-500">
        Déjà un compte ?{" "}
        <Link
          href={`/login?plan=${plan}&next=${encodeURIComponent(destination)}`}
          className="font-medium text-pink-600 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
