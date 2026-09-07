"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { login, type AuthState } from "@/app/auth/actions";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthInput, AuthPasswordInput } from "@/components/auth/auth-input";
import { AuthOAuthButtons } from "@/components/auth/auth-oauth-buttons";

const initialState: AuthState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);

  return (
    <div>
      <AuthOAuthButtons
        pendingProvider={pendingProvider}
        onPendingChange={setPendingProvider}
      />

      <AuthDivider />

      <form action={formAction} className="space-y-4">
        {state.error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600"
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
          placeholder="toi@exemple.com"
        />

        <AuthPasswordInput
          id="password"
          name="password"
          label="Mot de passe"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          showPassword={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />

        <button
          type="submit"
          disabled={pending || pendingProvider !== null}
          className="w-full rounded-full bg-zinc-950 px-6 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Connexion…
            </span>
          ) : (
            "Se connecter"
          )}
        </button>
      </form>
    </div>
  );
}
