"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe, type StripeEmbeddedCheckoutAnalyticsEventUnion } from "@stripe/stripe-js";

export function StripeEmbeddedCheckout({
  clientSecret,
  publishableKey,
  onRendered,
  onSubmitFailed,
}: {
  clientSecret: string;
  publishableKey: string;
  /** Stripe has actually drawn its payment form on screen. */
  onRendered?: () => void;
  /**
   * The customer hit "Payer" and the payment didn't go through (e.g. card declined).
   * Only fires once Stripe enables Embedded Checkout analytics (private preview)
   * on the account; the webhook tracks "Payer" and failures in the meantime.
   */
  onSubmitFailed?: () => void;
}) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  // Stripe ignores option changes after mount: keep the latest callbacks in a ref.
  const callbacksRef = useRef({ onRendered, onSubmitFailed });
  useEffect(() => {
    callbacksRef.current = { onRendered, onSubmitFailed };
  }, [onRendered, onSubmitFailed]);

  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const reportRendered = useCallback(() => {
    if (renderedRef.current) return;
    renderedRef.current = true;
    callbacksRef.current.onRendered?.();
  }, []);

  // Stripe draws its form in an iframe it adds to our container: the iframe's
  // load event is when the form shows up on screen.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let iframe: HTMLIFrameElement | null = null;

    function watchIframe() {
      if (iframe) return;
      iframe = container!.querySelector("iframe");
      if (!iframe) return;
      observer.disconnect();
      iframe.addEventListener("load", reportRendered, { once: true });
    }

    const observer = new MutationObserver(watchIframe);
    observer.observe(container, { childList: true, subtree: true });
    watchIframe();

    return () => {
      observer.disconnect();
      iframe?.removeEventListener("load", reportRendered);
    };
  }, [reportRendered]);

  const options = useMemo(
    () => ({
      clientSecret,
      onAnalyticsEvent: (event: StripeEmbeddedCheckoutAnalyticsEventUnion) => {
        const callbacks = callbacksRef.current;
        if (event.eventType === "checkoutRendered") {
          reportRendered();
        } else if (
          event.eventType === "checkoutSubmitFailed" &&
          event.details.failureReason !== "user_cancelled"
        ) {
          callbacks.onSubmitFailed?.();
        }
      },
    }),
    [clientSecret, reportRendered]
  );

  if (!publishableKey) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Le paiement n&apos;est pas configuré (clé publique Stripe manquante).
      </p>
    );
  }

  return (
    <div ref={containerRef} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
