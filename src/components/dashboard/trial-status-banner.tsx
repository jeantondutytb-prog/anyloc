"use client";

import { useEffect, useState } from "react";
import { Clock3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTrialRemaining, getTrialRemainingMs } from "@/lib/trial";

export function TrialStatusBanner({ trialEndsAt }: { trialEndsAt: string }) {
  const [remainingMs, setRemainingMs] = useState(() =>
    getTrialRemainingMs({ trial_status: "active", trial_ends_at: trialEndsAt, trial_started_at: null, trial_payment_method_id: null })
  );
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemainingMs(
        getTrialRemainingMs({
          trial_status: "active",
          trial_ends_at: trialEndsAt,
          trial_started_at: null,
          trial_payment_method_id: null,
        })
      );
    }, 1000);

    return () => window.clearInterval(interval);
  }, [trialEndsAt]);

  async function cancelTrial() {
    setCancelling(true);
    setError(null);

    try {
      const response = await fetch("/api/trial/cancel", { method: "POST" });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'annuler l'essai.");
      }

      setCancelled(true);
      window.location.reload();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Impossible d'annuler l'essai."
      );
    } finally {
      setCancelling(false);
    }
  }

  if (cancelled || remainingMs <= 0) {
    return null;
  }

  return (
    <div className="border-b border-pink-200 bg-pink-50 px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 text-sm text-pink-950">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Essai gratuit en cours</p>
            <p className="mt-0.5 text-pink-900/80">
              Temps restant : {formatTrialRemaining(remainingMs)}. Ta carte sera
              débitée automatiquement à la fin de l&apos;essai sauf si tu annules.
            </p>
            {error ? <p className="mt-2 text-red-600">{error}</p> : null}
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          disabled={cancelling}
          onClick={() => void cancelTrial()}
        >
          {cancelling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Annulation…
            </>
          ) : (
            "Annuler avant le débit"
          )}
        </Button>
      </div>
    </div>
  );
}
