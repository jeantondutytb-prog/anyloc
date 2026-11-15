"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Banknote } from "lucide-react";
import { CHECKOUT_COPY } from "@/lib/checkout-copy";
import { CLIPPER_OFFER_CAMPAIGN } from "@/lib/checkout-clipper-offer";

/**
 * Last resort once the -50 % close offer is turned down: use Anyloc for free
 * by posting clips (clipper-offer A/B test).
 */
export function CheckoutClipperSheet({
  onAccept,
  onDismiss,
}: {
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const copy = CHECKOUT_COPY;
  const acceptRef = useRef<HTMLAnchorElement>(null);

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
        aria-label={copy.clipperOfferTitle}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md animate-[checkoutModalIn_.25s_ease-out] rounded-3xl bg-white p-5 text-center shadow-2xl"
      >
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-pink-50 text-pink-600">
          <Banknote className="h-5 w-5" />
        </span>
        <p className="mt-3 text-lg font-bold text-zinc-900">{copy.clipperOfferTitle}</p>
        <p className="mt-1.5 text-sm text-zinc-600">{copy.clipperOfferLead}</p>
        <Link
          ref={acceptRef}
          href={`/clippeurs?utm_campaign=${CLIPPER_OFFER_CAMPAIGN}`}
          onClick={onAccept}
          className="btn-gradient mt-4 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-bold text-white transition hover:opacity-90"
        >
          {copy.clipperOfferCta}
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 w-full py-2 text-sm text-zinc-500 transition hover:text-zinc-900"
        >
          {copy.downsellDismiss}
        </button>
      </div>
    </div>,
    document.body
  );
}
