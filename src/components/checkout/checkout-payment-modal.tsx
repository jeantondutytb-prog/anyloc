"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, Lock, X } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/checkout/stripe-embedded-checkout";
import { isCrispHiddenPath, setCrispBubbleHidden } from "@/components/crisp/crisp-visibility";
import { track } from "@/lib/analytics/track";
import { CHECKOUT_COPY } from "@/lib/checkout-copy";
import { getFirstMonthOfferPrice } from "@/lib/checkout-first-month-offer";
import { isNetworkError, requestCheckoutSession } from "@/lib/checkout-request";
import { GUARANTEE, type Plan } from "@/lib/constants";

/**
 * Payment popup opened by the paywall's "Continuer": Stripe's embedded
 * checkout for the chosen plan, with the guarantee reminder on top and a
 * fallback to the Stripe-hosted page if the form doesn't load. When the bank
 * refuses the card for lack of funds, offers -50 % on the shortest plan.
 * Rendered only while open, so every opening starts a fresh session.
 */
/** How often the popup asks whether its checkout was refused for lack of funds. */
const DECLINE_POLL_MS = 3000;

export function CheckoutPaymentModal({
  plan,
  offerPlan,
  offerSessionId,
  onDeclineOffer,
  stripePublishableKey,
  hostedRedirecting,
  hostedError,
  onHostedFallback,
  onClose,
  zIndexClassName = "z-[100]",
}: {
  plan: Plan;
  /** Shortest plan of the grid: its 1st month at -50 % when the card is refused for lack of funds. */
  offerPlan: Plan;
  /** This popup is the discounted checkout: the refused (or closed) one it comes from. */
  offerSessionId?: string;
  onDeclineOffer: (declinedSessionId: string) => void;
  stripePublishableKey: string;
  /** The hosted-page fallback is loading. */
  hostedRedirecting: boolean;
  hostedError?: string | null;
  onHostedFallback: () => void;
  /** `sessionId`: the checkout being closed, for the -50 % offer of the A/B test. */
  onClose: (sessionId: string | null) => void;
  /** Stacking of the overlay: the web remote's map sits above z-[100]. */
  zIndexClassName?: string;
}) {
  const copy = CHECKOUT_COPY;
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);
  // Closing a drawn form first asks why, in place of the form.
  const [askingExitReason, setAskingExitReason] = useState(false);
  // Read by the Escape handler, which is set up once.
  const sessionIdRef = useRef<string | null>(null);
  const formRenderedRef = useRef(false);
  const askingExitReasonRef = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  // When this attempt to load the form started, to time Stripe's real render.
  const loadStartedAtRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const startedAt = performance.now();
    loadStartedAtRef.current = startedAt;

    requestCheckoutSession(
      "/api/stripe/embedded-checkout",
      plan.id,
      controller.signal,
      offerSessionId
    )
      .then((data) => {
        if (!data.clientSecret) {
          throw new Error(data.error ?? copy.errStart);
        }
        setClientSecret(data.clientSecret);
        setSessionId(data.sessionId ?? null);
        sessionIdRef.current = data.sessionId ?? null;
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
  }, [plan.id, attempt, copy, offerSessionId]);

  // Stripe's form doesn't tell the page why a card was refused: the webhook
  // stamps it on the session, read back here. Once discounted, no second offer.
  useEffect(() => {
    if (!sessionId || declined || offerSessionId) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetch(`/api/stripe/checkout-decline?session_id=${encodeURIComponent(sessionId)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json() as Promise<{ declined?: boolean }>)
        .then((data) => {
          if (!data.declined) return;
          setDeclined(true);
          track("checkout_decline_offer_shown", { plan: plan.id, offer_plan: offerPlan.id });
        })
        .catch(() => {});
    }, DECLINE_POLL_MS);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [sessionId, declined, offerSessionId, plan.id, offerPlan.id]);

  useEffect(() => {
    closeRef.current?.focus();
    // On mobile the Crisp bubble would sit on Stripe's pay button.
    setCrispBubbleHidden(true);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") requestCloseRef.current();
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      setCrispBubbleHidden(isCrispHiddenPath(window.location.pathname));
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  // checkout_payment_form_ready only means the session came back from the
  // server; this one means Stripe actually drew its form on screen.
  function handleRendered() {
    formRenderedRef.current = true;
    track("checkout_stripe_form_rendered", {
      plan: plan.id,
      load_ms: Math.round(performance.now() - loadStartedAtRef.current),
      retry: attempt > 0,
    });
  }

  // Only someone who saw the card form is asked why they leave; closing the
  // question again closes the popup for good.
  function requestClose() {
    if (!formRenderedRef.current) {
      onClose(sessionIdRef.current);
      return;
    }
    if (askingExitReasonRef.current) {
      answerExitReason(null);
      return;
    }
    askingExitReasonRef.current = true;
    setAskingExitReason(true);
    track("checkout_exit_question_shown", { plan: plan.id });
  }
  const requestCloseRef = useRef(requestClose);
  useEffect(() => {
    requestCloseRef.current = requestClose;
  });

  function answerExitReason(reason: string | null) {
    track("checkout_exit_reason", {
      plan: plan.id,
      reason: reason ?? "skipped",
      $set: reason ? { checkout_exit_reason: reason } : undefined,
    });
    onClose(sessionIdRef.current);
  }

  const price = plan.price.replace("€", " €");
  const offerPrice = getFirstMonthOfferPrice(offerPlan.price);

  function retry() {
    setError(null);
    setAttempt((count) => count + 1);
  }

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClassName} flex cursor-pointer items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm`}
      onClick={requestClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.modalTitle}
        onClick={(event) => event.stopPropagation()}
        className="flex cursor-auto max-h-[calc(100dvh-2rem)] w-full max-w-md animate-[checkoutModalIn_.25s_ease-out] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <p className="text-sm font-bold text-zinc-900">
            {plan.name} ·{" "}
            {offerSessionId ? copy.firstMonthOfferHeader(getFirstMonthOfferPrice(plan.price)) : price}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={requestClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:text-zinc-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {askingExitReason ? (
          <div className="px-4 pb-5 pt-4">
            <p className="text-base font-bold text-zinc-900">{copy.exitQuestionTitle}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{copy.exitQuestionLead}</p>
            <div className="mt-3 flex flex-col gap-2">
              {copy.exitQuestionReasons.map((reason) => (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => answerExitReason(reason.id)}
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-left text-sm font-semibold text-zinc-800 transition hover:border-pink-300 hover:bg-pink-50"
                >
                  {reason.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => answerExitReason(null)}
              className="mt-3 w-full text-center text-xs font-medium text-zinc-500 underline transition hover:text-zinc-800"
            >
              {copy.exitQuestionSkip}
            </button>
          </div>
        ) : null}

        <div
          className={
            askingExitReason ? "hidden" : "overflow-y-auto overscroll-contain px-4 pb-4 pt-3"
          }
        >
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

          {declined && sessionId ? (
            <div className="mt-3 rounded-2xl border border-pink-200 bg-pink-50 p-3">
              <p className="text-sm font-bold text-zinc-900">{copy.declineOfferTitle}</p>
              <p className="mt-0.5 text-xs text-zinc-600">
                {copy.declineOfferLead(
                  offerPlan.name,
                  offerPrice,
                  offerPlan.price.replace("€", " €")
                )}
                {plan.mobileApp && !offerPlan.mobileApp ? ` ${copy.downgradeNoMobileApp}` : null}
              </p>
              <button
                type="button"
                onClick={() => onDeclineOffer(sessionId)}
                className="btn-gradient mt-2 w-full rounded-full px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              >
                {copy.declineOfferCta(offerPrice)}
              </button>
            </div>
          ) : null}

          <div className={error ? "mt-3" : "mt-3 min-h-[320px]"}>
            {clientSecret ? (
              <StripeEmbeddedCheckout
                clientSecret={clientSecret}
                publishableKey={stripePublishableKey}
                onRendered={handleRendered}
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
