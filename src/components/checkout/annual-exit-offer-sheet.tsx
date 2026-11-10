"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CHECKOUT_COPY } from "@/lib/checkout-copy";
import { formatAnnualExitExpiry } from "@/lib/annual-exit-offer";

/**
 * Shown once when a visitor leaves the paywall (payment popup closed, or back
 * button): the annual plan at `offerPrice` instead of `fullPrice`, kept for as
 * long as they stay subscribed. `expiresAt` is the real end, set by the server.
 */
export function AnnualExitOfferSheet({
  fullPrice,
  offerPrice,
  expiresAt,
  onAccept,
  onDismiss,
}: {
  fullPrice: string;
  offerPrice: string;
  expiresAt: Date;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const copy = CHECKOUT_COPY;
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    acceptRef.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onDismiss]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.annualExitTitle}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md animate-[checkoutModalIn_.25s_ease-out] rounded-3xl bg-white p-5 text-center shadow-2xl"
      >
        <p className="text-lg font-bold text-zinc-900">{copy.annualExitTitle}</p>
        <p className="mt-1.5 text-sm text-zinc-600">{copy.annualExitLead}</p>
        <p className="mt-2 text-sm font-semibold text-zinc-900 tabular-nums">
          <span className="mr-1.5 text-zinc-400 line-through">{fullPrice}</span>
          {offerPrice}
        </p>
        <p className="mt-1 text-xs text-zinc-500">{copy.annualExitTerms}</p>
        <p className="mt-1 text-xs font-semibold text-pink-600">
          {copy.annualExitExpiry(formatAnnualExitExpiry(expiresAt))}
        </p>
        <button
          ref={acceptRef}
          type="button"
          onClick={onAccept}
          className="btn-gradient mt-4 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-bold text-white transition hover:opacity-90"
        >
          {copy.annualExitCta}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 w-full py-2 text-sm text-zinc-500 transition hover:text-zinc-900"
        >
          {copy.annualExitDismiss}
        </button>
      </div>
    </div>,
    document.body
  );
}
