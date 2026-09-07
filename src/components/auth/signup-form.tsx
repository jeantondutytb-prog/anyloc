"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signup, type AuthState } from "@/app/auth/actions";
import { AuthInput } from "@/components/auth/auth-input";
import { Button } from "@/components/ui/button";

const initialState: AuthState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
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
        id="firstName"
        name="firstName"
        type="text"
        label="Prénom"
        autoComplete="given-name"
        required
        placeholder="Alex"
      />

      <AuthInput
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        placeholder="toi@email.com"
      />

      <div>
        <label className="text-sm font-medium text-zinc-700" htmlFor="password">
          Mot de passe
        </label>
        <div className="relative mt-1.5">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="Au moins 6 caractères"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-11 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-600"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Création du compte...
          </>
        ) : (
          "Démarrer gratuitement"
        )}
      </Button>

      <p className="text-center text-xs leading-relaxed text-zinc-600">
        En créant un compte, tu acceptes nos conditions d&apos;utilisation.
        Annulation possible à tout moment.
      </p>
    </form>
  );
}
