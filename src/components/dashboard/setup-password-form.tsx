"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthPasswordInput } from "@/components/auth/auth-input";
import {
  updatePassword,
  type SettingsActionState,
} from "@/app/dashboard/(protected)/settings/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

const initialActionState: SettingsActionState = {};

export function SetupPasswordForm({
  preview = false,
}: {
  preview?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [previewDone, setPreviewDone] = useState(false);
  const [passwordState, passwordAction, passwordPending] = useActionState(
    updatePassword,
    initialActionState
  );

  const done = preview ? previewDone : Boolean(passwordState.success);

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Mot de passe enregistré
        </p>
        <p className="mt-1 text-emerald-900/90">
          Dans Anyloc, connecte-toi avec le <strong>même email</strong> et
          ce mot de passe. Le bouton Google marche aussi si c&apos;est le même
          compte.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
      <p className="flex items-center gap-2 font-semibold">
        <KeyRound className="h-4 w-4 shrink-0" />
        Avant d&apos;ouvrir Anyloc : choisis un mot de passe
      </p>
      <p className="mt-1 text-amber-900/90">
        Tu as payé sans en créer un. Sans ça, Setup affiche « email ou mot de
        passe incorrect » — on dirait que ça marche pas.
      </p>

      <form
        className="mt-4 space-y-3"
        action={preview ? undefined : passwordAction}
        onSubmit={
          preview
            ? (event) => {
                event.preventDefault();
                setPreviewDone(true);
              }
            : undefined
        }
      >
        <AuthPasswordInput
          id="setup-password"
          name="password"
          label="Mot de passe"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          showPassword={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />
        <AuthPasswordInput
          id="setup-confirm-password"
          name="confirmPassword"
          label="Confirme-le"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          showPassword={showConfirmPassword}
          onToggle={() => setShowConfirmPassword((value) => !value)}
        />
        {passwordState.error ? (
          <p className="text-sm text-red-600">{passwordState.error}</p>
        ) : null}
        <Button type="submit" size="sm" disabled={passwordPending}>
          {passwordPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Enregistrer et continuer
        </Button>
      </form>
    </div>
  );
}
