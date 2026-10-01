"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { login, type AuthState } from "@/app/auth/actions";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthInput, AuthPasswordInput } from "@/components/auth/auth-input";
import { GoogleAuthLink } from "@/components/auth/google-auth-link";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/track";

const initialState: AuthState = {};

export function LoginForm({
  plan = "annual",
  redirectTo,
}: {
  plan?: string;
  redirectTo?: string;
}) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  // A new state object comes back after every submission, even an identical error.
  useEffect(() => {
    if (state.error) {
      track("auth_failed", { flow: "login", method: "password", error: state.error });
    }
  }, [state]);
  const destination = redirectTo ?? "/dashboard";

  return (
    <div>
      <form
        action={formAction}
        onSubmit={() => track("auth_submitted", { flow: "login", method: "password", plan })}
        className="space-y-4"
      >
        <input type="hidden" name="redirectTo" value={destination} />
        {state.error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
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
          autoComplete="current-password"
          required
          placeholder="••••••••"
          showPassword={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connexion…
            </>
          ) : (
            "Se connecter"
          )}
        </Button>
      </form>

      <AuthDivider />
      <GoogleAuthLink redirectTo={destination} />

      <p className="mt-4 text-center text-sm text-[#8B8B94]">
        Pas encore de compte ?{" "}
        <Link
          href={`/signup?plan=${plan}&next=${encodeURIComponent(destination)}`}
          className="font-medium text-[#F472B6] hover:underline"
        >
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
