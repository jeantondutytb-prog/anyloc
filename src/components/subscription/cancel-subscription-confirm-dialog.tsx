"use client";

import { AlertTriangle, CreditCard, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type CancelSubscriptionConfirmDialogProps = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function CancelSubscriptionConfirmDialog({
  open,
  loading = false,
  onClose,
  onConfirm,
}: CancelSubscriptionConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-subscription-title"
    >
      <Card className="relative w-full max-w-lg border-pink-200/80 bg-gradient-to-b from-amber-50/80 to-white p-6 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          data-track="cancel_subscription_dismissed"
          data-track-context="paid"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-50"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
          <CreditCard className="h-6 w-6 text-amber-700" />
        </div>

        <h2
          id="cancel-subscription-title"
          className="mt-5 text-2xl font-bold tracking-tight text-zinc-900"
        >
          Résilier ton abonnement ?
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
          La résiliation prend effet immédiatement. Tu ne pourras plus changer
          ta position GPS, ni accéder au dashboard, aux guides et aux
          téléchargements.
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            Aucun remboursement au prorata. Si tu envisages une demande de
            remboursement au titre de la garantie 48 h, fais-la{" "}
            <strong>avant</strong> de résilier.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            type="button"
            className="border-amber-200 bg-amber-800 text-white hover:bg-amber-900 sm:flex-1"
            disabled={loading}
            onClick={onConfirm}
            data-track="cancel_subscription_confirmed"
            data-track-context="paid"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Oui, résilier mon abonnement
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="sm:flex-1"
            disabled={loading}
            onClick={onClose}
            data-track="cancel_subscription_dismissed"
            data-track-context="paid"
          >
            Garder mon abonnement
          </Button>
        </div>
      </Card>
    </div>
  );
}
