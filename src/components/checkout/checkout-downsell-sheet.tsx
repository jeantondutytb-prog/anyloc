"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Monitor } from "lucide-react";
import { CHECKOUT_COPY } from "@/lib/checkout-copy";
import type { Plan } from "@/lib/constants";

/**
 * Shown once when the payment popup of a pricier plan is closed: most of those
 * visitors close it within seconds of seeing the upfront price, so offer the
 * monthly plan before they leave.
 */
export function CheckoutDownsellSheet({
  plan,
  offerPlan,
  onAccept,
  onDismiss,
}: {
  plan: Plan;
  offerPlan: Plan;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const copy = CHECKOUT_COPY;
  const acceptRef = useRef<HTMLButtonElement>(null);
  const planPrice = plan.price.replace("€", " €");
  const offerPrice = `${offerPlan.price.replace("€", " €")}${offerPlan.period}`;

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
        aria-label={copy.downsellTitle(planPrice)}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md animate-[checkoutModalIn_.25s_ease-out] rounded-3xl bg-white p-5 text-center shadow-2xl"
      >
        <p className="text-lg font-bold text-zinc-900">{copy.downsellTitle(planPrice)}</p>
        <p className="mt-1.5 text-sm text-zinc-600">{copy.downsellLead(offerPlan.name, offerPrice)}</p>
        {plan.mobileApp && !offerPlan.mobileApp ? (
          <p className="mt-2 text-xs text-zinc-500">
            <Monitor className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
            {copy.planDesktopOnly} · {copy.downgradeNoMobileApp}
          </p>
        ) : null}
        <button
          ref={acceptRef}
          type="button"
          onClick={onAccept}
          className="btn-gradient mt-4 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-bold text-white transition hover:opacity-90"
        >
          {copy.downsellCta(offerPrice)}
        </button>
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
