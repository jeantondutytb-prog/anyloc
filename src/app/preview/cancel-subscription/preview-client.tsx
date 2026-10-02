"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CancelSubscriptionConfirmDialog } from "@/components/subscription/cancel-subscription-confirm-dialog";

export function CancelSubscriptionPreview() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">
            Preview dev
          </p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">
            Popup avant désabonnement
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Simule le clic sur « Se désabonner ».
          </p>
        </div>

        <Card className="border-amber-200 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">Abonnement actif</p>
              <p className="mt-1 text-sm text-zinc-500">
                Clique sur le bouton pour voir le popup de confirmation.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-4 border-amber-200 text-amber-800 hover:border-amber-300 hover:bg-amber-50"
                onClick={() => setOpen(true)}
              >
                Se désabonner
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <CancelSubscriptionConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        previewOffer={{ eligible: true, kind: "repeating", label: "-50 % sur tes 3 prochains mois" }}
      />
    </div>
  );
}
