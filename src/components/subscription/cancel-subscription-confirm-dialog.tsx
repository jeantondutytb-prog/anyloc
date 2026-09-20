"use client";

import { AlertTriangle, Clock3, CreditCard, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatTrialRemaining } from "@/lib/trial";
import { cn } from "@/lib/utils";

export type CancelSubscriptionContext = "trial" | "paid";

type CancelSubscriptionConfirmDialogProps = {
  open: boolean;
  context: CancelSubscriptionContext;
  trialRemainingMs?: number;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function ContextIcon({ context }: { context: CancelSubscriptionContext }) {
  if (context === "trial") {
    return <Sparkles className="h-6 w-6 text-pink-600" />;
  }

  return <CreditCard className="h-6 w-6 text-amber-700" />;
}

export function CancelSubscriptionConfirmDialog({
  open,
  context,
  trialRemainingMs,
  loading = false,
  onClose,
  onConfirm,
}: CancelSubscriptionConfirmDialogProps) {
  if (!open) {
    return null;
  }

  const isTrial = context === "trial";
  const title = isTrial
    ? "Annuler ton essai gratuit ?"
    : "Résilier ton abonnement ?";

  const description = isTrial
    ? trialRemainingMs && trialRemainingMs > 0
      ? `Si tu annules maintenant, ton accès est coupé tout de suite — même s'il te reste ${formatTrialRemaining(trialRemainingMs)} sur l'essai. Tu ne pourras plus tester Anyloc sur Snap, Insta et Tinder Web.`
      : "Si tu annules maintenant, ton accès est coupé immédiatement. Tu ne pourras plus tester Anyloc sur Snap, Insta et Tinder Web."
    : "La résiliation prend effet immédiatement. Tu ne pourras plus changer ta position GPS, ni accéder au dashboard, aux guides et aux téléchargements.";

  const confirmLabel = isTrial
    ? "Oui, annuler l'essai"
    : "Oui, résilier mon abonnement";

  const dismissLabel = isTrial ? "Continuer mon essai" : "Garder mon abonnement";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-subscription-title"
    >
      <Card
        className={cn(
          "relative w-full max-w-lg border-pink-200/80 bg-gradient-to-b from-pink-50/80 to-white p-6 sm:p-8",
          !isTrial && "from-amber-50/80"
        )}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-50"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
          <ContextIcon context={context} />
        </div>

        <h2
          id="cancel-subscription-title"
          className="mt-5 text-2xl font-bold tracking-tight text-zinc-900"
        >
          {title}
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
          {description}
        </p>

        {isTrial && trialRemainingMs && trialRemainingMs > 0 ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-pink-200 bg-white/80 px-4 py-3 text-sm text-pink-950">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" />
            <p>
              Temps restant sur l&apos;essai :{" "}
              <span className="font-semibold">
                {formatTrialRemaining(trialRemainingMs)}
              </span>
            </p>
          </div>
        ) : null}

        {!isTrial ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p>
              Aucun remboursement au prorata. Si tu envisages une demande de
              remboursement au titre de la garantie 48 h, fais-la{" "}
              <strong>avant</strong> de résilier.
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            type="button"
            className={cn(
              "sm:flex-1",
              isTrial
                ? "bg-red-600 hover:bg-red-700"
                : "border-amber-200 bg-amber-800 text-white hover:bg-amber-900"
            )}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="sm:flex-1"
            disabled={loading}
            onClick={onClose}
          >
            {dismissLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
