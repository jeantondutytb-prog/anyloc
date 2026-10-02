"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CreditCard,
  Gift,
  Loader2,
  MessageCircle,
  PartyPopper,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { track } from "@/lib/analytics/track";
import type { RetentionOffer } from "@/lib/retention-offer";

type CancelSubscriptionConfirmDialogProps = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Dev preview: skips the network and shows this offer. */
  previewOffer?: RetentionOffer;
};

const REASONS = [
  { id: "too_expensive", label: "C'est trop cher" },
  { id: "not_working", label: "Ça ne marche pas sur mon téléphone" },
  { id: "no_longer_needed", label: "Je n'en ai plus besoin" },
  { id: "other_service", label: "Je passe à un autre service" },
  { id: "other", label: "Autre raison" },
] as const;

type Reason = (typeof REASONS)[number]["id"];
type Step = "reason" | "help" | "offer" | "accepted" | "confirm";

declare global {
  interface Window {
    $crisp?: Array<[string, ...unknown[]]>;
  }
}

/**
 * Cancelling stays immediate, but first: why are you leaving, technical help
 * when it doesn't work, and a one-time -50 % offer. Every step can skip ahead.
 */
export function CancelSubscriptionConfirmDialog({
  open,
  loading = false,
  onClose,
  onConfirm,
  previewOffer,
}: CancelSubscriptionConfirmDialogProps) {
  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState<Reason | null>(null);
  const [offer, setOffer] = useState<RetentionOffer>(previewOffer ?? { eligible: false });
  const [accepting, setAccepting] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [acceptedLabel, setAcceptedLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!open || previewOffer) {
      return;
    }

    let active = true;
    void fetch("/api/subscription/retention-offer")
      .then((response) => (response.ok ? response.json() : { eligible: false }))
      .then((result: RetentionOffer) => {
        if (active) setOffer(result);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [open, previewOffer]);

  if (!open) {
    return null;
  }

  function close() {
    track("cancel_flow_abandoned", { step, reason });
    setStep("reason");
    setReason(null);
    setOfferError(null);
    onClose();
  }

  function goToOfferOrConfirm() {
    setStep(offer.eligible ? "offer" : "confirm");
  }

  function chooseReason(next: Reason) {
    setReason(next);
    track("cancel_reason_selected", { reason: next });
    if (next === "not_working") {
      setStep("help");
    } else {
      goToOfferOrConfirm();
    }
  }

  async function acceptOffer() {
    if (previewOffer) {
      setAcceptedLabel(previewOffer.eligible ? previewOffer.label : null);
      setStep("accepted");
      return;
    }

    setAccepting(true);
    setOfferError(null);

    try {
      const response = await fetch("/api/subscription/retention-offer", { method: "POST" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? "Impossible d'appliquer l'offre.");
      }

      track("retention_offer_accepted", { reason });
      setAcceptedLabel(payload.label ?? null);
      setStep("accepted");
    } catch (error) {
      setOfferError(error instanceof Error ? error.message : "Impossible d'appliquer l'offre.");
    } finally {
      setAccepting(false);
    }
  }

  function openChat() {
    track("cancel_help_chat_opened", { reason });
    window.$crisp?.push(["do", "chat:open"]);
    close();
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
          onClick={close}
          disabled={loading || accepting}
          data-track="cancel_subscription_dismissed"
          data-track-context="paid"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-50"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        {step === "reason" ? (
          <>
            <StepIcon icon={<CreditCard className="h-6 w-6 text-amber-700" />} />
            <h2 id="cancel-subscription-title" className="mt-5 text-2xl font-bold tracking-tight text-zinc-900">
              Avant de partir : pourquoi ?
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Ta réponse nous aide à améliorer Anyloc.
            </p>
            <div className="mt-5 grid gap-2">
              {REASONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => chooseReason(item.id)}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-800 transition-colors hover:border-pink-300 hover:bg-pink-50/40"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {step === "help" ? (
          <>
            <StepIcon icon={<MessageCircle className="h-6 w-6 text-pink-600" />} />
            <h2 id="cancel-subscription-title" className="mt-5 text-2xl font-bold tracking-tight text-zinc-900">
              On le règle ensemble ?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              La plupart des soucis viennent de l&apos;installation et se règlent en
              quelques minutes. Écris-nous, on te répond vite.
            </p>
            <div className="mt-6 grid gap-3">
              <Button type="button" onClick={openChat}>
                <MessageCircle className="h-4 w-4" />
                Écrire au support
              </Button>
              <Link
                href="/dashboard/installation"
                onClick={() => track("cancel_help_guide_opened", { reason })}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 text-sm font-medium text-zinc-900 shadow-sm hover:border-pink-300 hover:bg-zinc-50"
              >
                <BookOpen className="h-4 w-4" />
                Revoir le guide d&apos;installation
              </Link>
              <SkipButton onClick={goToOfferOrConfirm} />
            </div>
          </>
        ) : null}

        {step === "offer" && offer.eligible ? (
          <>
            <StepIcon icon={<Gift className="h-6 w-6 text-pink-600" />} />
            <h2 id="cancel-subscription-title" className="mt-5 text-2xl font-bold tracking-tight text-zinc-900">
              Reste, on te fait {offer.label}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              La réduction s&apos;applique automatiquement à ton abonnement, sans rien
              changer d&apos;autre. Offre valable une seule fois.
            </p>
            {offerError ? (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{offerError}</p>
            ) : null}
            <div className="mt-6 grid gap-3">
              <Button type="button" disabled={accepting} onClick={() => void acceptOffer()}>
                {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                J&apos;en profite
              </Button>
              <SkipButton
                disabled={accepting}
                onClick={() => {
                  track("retention_offer_declined", { reason });
                  setStep("confirm");
                }}
              />
            </div>
          </>
        ) : null}

        {step === "accepted" ? (
          <>
            <StepIcon icon={<PartyPopper className="h-6 w-6 text-pink-600" />} />
            <h2 id="cancel-subscription-title" className="mt-5 text-2xl font-bold tracking-tight text-zinc-900">
              C&apos;est fait, merci de rester !
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {acceptedLabel ? `${acceptedLabel.charAt(0).toUpperCase()}${acceptedLabel.slice(1)}` : "Ta réduction"}{" "}
              est appliquée à ton abonnement.
            </p>
            <Button type="button" className="mt-6 w-full" onClick={close}>
              Retour à mon compte
            </Button>
          </>
        ) : null}

        {step === "confirm" ? (
          <>
            <StepIcon icon={<CreditCard className="h-6 w-6 text-amber-700" />} />
            <h2 id="cancel-subscription-title" className="mt-5 text-2xl font-bold tracking-tight text-zinc-900">
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
                onClick={() => {
                  track("cancel_subscription_confirmed", { context: "paid", reason });
                  onConfirm();
                }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Oui, résilier mon abonnement
              </Button>
              <Button type="button" variant="secondary" className="sm:flex-1" disabled={loading} onClick={close}>
                Garder mon abonnement
              </Button>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}

function StepIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
      {icon}
    </div>
  );
}

function SkipButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-sm text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline disabled:opacity-50"
    >
      Non merci, je veux résilier
    </button>
  );
}
