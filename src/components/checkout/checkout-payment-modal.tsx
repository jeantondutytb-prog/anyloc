"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, Lock, X } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/checkout/stripe-embedded-checkout";
import { isCrispHiddenPath, setCrispBubbleHidden } from "@/components/crisp/crisp-visibility";
import { track } from "@/lib/analytics/track";
import { CHECKOUT_COPY } from "@/lib/checkout-copy";
import { isNetworkError, requestCheckoutSession } from "@/lib/checkout-request";
import { GUARANTEE, type Plan } from "@/lib/constants";

/**
 * Payment popup opened by the paywall's "Continuer": Stripe's embedded
 * checkout for the chosen plan, with the guarantee reminder on top and a
 * fallback to the Stripe-hosted page if the form doesn't load.
 * Rendered only while open, so every opening starts a fresh session.
 */
export function CheckoutPaymentModal({
  plan,
  stripePublishableKey,
  hostedRedirecting,
  hostedError,
  onHostedFallback,
  onClose,
}: {
  plan: Plan;
  stripePublishableKey: string;
  /** The hosted-page fallback is loading. */
  hostedRedirecting: boolean;
  hostedError?: string | null;
  onHostedFallback: () => void;
  onClose: () => void;
}) {
  const copy = CHECKOUT_COPY;
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const startedAt = performance.now();

    requestCheckoutSession("/api/stripe/embedded-checkout", plan.id, controller.signal)
      .then((data) => {
        if (!data.clientSecret) {
          throw new Error(data.error ?? copy.errStart);
        }
        setClientSecret(data.clientSecret);
        track("checkout_payment_form_ready", {
          plan: plan.id,
          load_ms: Math.round(performance.now() - startedAt),
          retry: attempt > 0,
          network_retries: data.networkRetries,
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const networkError = isNetworkError(err);
        setError(
          networkError ? copy.errNetwork : err instanceof Error ? err.message : copy.errGeneric
        );
        track("checkout_error", {
          plan: plan.id,
          error: err instanceof Error ? err.message : String(err),
          error_type: networkError ? "network" : "server",
          online: navigator.onLine,
        });
      });

    return () => controller.abort();
  }, [plan.id, attempt, copy]);

  useEffect(() => {
    closeRef.current?.focus();
    // On mobile the Crisp bubble would sit on Stripe's pay button.
    setCrispBubbleHidden(true);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      setCrispBubbleHidden(isCrispHiddenPath(window.location.pathname));
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  function retry() {
    setError(null);
    setAttempt((count) => count + 1);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.modalTitle}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md animate-[checkoutModalIn_.25s_ease-out] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <p className="text-sm font-bold text-zinc-900">
            {plan.name} · {plan.price.replace("€", " €")}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:text-zinc-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
          <div className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs leading-snug text-emerald-900/80">
            <Check className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={3} />
            <p>
              <span className="font-bold text-emerald-900">{GUARANTEE.title}</span>{" "}
              {GUARANTEE.summary}{" "}
              <Link
                href="/politique-de-remboursement"
                target="_blank"
                rel="noreferrer"
                className="whitespace-nowrap text-[10px] font-semibold text-emerald-700 underline"
              >
                {copy.guaranteeConditionsToggle}
              </Link>
            </p>
          </div>
          <p className="mt-2 text-xs text-zinc-500">{copy.modalCancelAnytime}</p>

          <div className={error ? "mt-3" : "mt-3 min-h-[320px]"}>
            {clientSecret ? (
              <StripeEmbeddedCheckout
                clientSecret={clientSecret}
                publishableKey={stripePublishableKey}
              />
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={retry}
                  data-track="checkout_retry_clicked"
                  data-track-plan={plan.id}
                  className="btn-gradient mt-3 rounded-full px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                >
                  {copy.retryCta}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm font-semibold text-zinc-500">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-pink-500" />
                {copy.payOpening}
              </div>
            )}
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
            <Lock className="h-3 w-3" />
            {copy.paymentProcessor}
          </p>
          <p className="mt-2 text-center text-xs text-zinc-500">
            {copy.modalFallbackLead}{" "}
            <button
              type="button"
              onClick={onHostedFallback}
              disabled={hostedRedirecting}
              className="font-medium text-zinc-700 underline transition hover:text-zinc-900 disabled:opacity-60"
            >
              {hostedRedirecting ? copy.redirecting : copy.modalFallbackCta}
            </button>
          </p>
          {hostedError ? (
            <p role="alert" className="mt-2 text-center text-xs text-red-600">
              {hostedError}
            </p>
          ) : null}
        </div>
      </div>

      <style jsx global>{`
        @keyframes checkoutModalIn {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
