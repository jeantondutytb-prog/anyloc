"use client";

import { useEffect, useRef, useState } from "react";
import { preconnect } from "react-dom";
import { Monitor, ShieldCheck, Smartphone, X } from "lucide-react";
import { CheckoutPaymentModal } from "@/components/checkout/checkout-payment-modal";
import { track } from "@/lib/analytics/track";
import { CHECKOUT_RETURN_APP_COOKIE } from "@/lib/checkout-intent-cookie";
import { CHECKOUT_COPY } from "@/lib/checkout-copy";
import { isNetworkError, requestCheckoutSession } from "@/lib/checkout-request";
import {
  getGridEntryPlanId,
  getGridPlans,
  getPlanGrid,
  GUARANTEE,
} from "@/lib/constants";
import { getStripe } from "@/lib/stripe-browser";
import { cn } from "@/lib/utils";

/** What the price is billed for, under the daily price. */
const BILLING_PERIOD_LABELS: Record<string, string> = {
  monthly: "1 mois",
  "6months": "6 mois",
  annual: "12 mois",
  month_v2: "1 mois",
  quarter_v2: "3 mois",
  year_v2: "12 mois",
};

/**
 * Plans of the web remote, in its dark style: opened from "Activer ma
 * localisation" after a teleport without subscription, so paying never leaves
 * /app. "Continuer" opens the same Stripe popup as /checkout.
 */
export function RemotePlansSheet({
  initialPlanId,
  stripePublishableKey,
  destination,
  onClose,
}: {
  /** Plan preselected, already mapped to the visitor's price grid. */
  initialPlanId: string;
  stripePublishableKey: string;
  destination: string;
  onClose: () => void;
}) {
  const copy = CHECKOUT_COPY;
  const plans = getGridPlans(getPlanGrid(initialPlanId));
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];
  const entryPlanId = getGridEntryPlanId(selectedPlan.id);
  const entryPlan =
    plans.find((plan) => plan.id === entryPlanId) ?? selectedPlan;
  // Card refused for lack of funds: the shortest plan at -50 % on the 1st month.
  const [offerSessionId, setOfferSessionId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  // Boot Stripe while the plans are read, so "Continuer" only waits for the session.
  preconnect("https://api.stripe.com");
  preconnect("https://checkout.stripe.com");
  useEffect(() => {
    if (stripePublishableKey) void getStripe(stripePublishableKey);
    track("remote_plans_viewed", { plan: initialPlanId });
  }, [stripePublishableKey, initialPlanId]);

  function selectPlan(planId: string) {
    track("checkout_plan_selected", {
      plan: planId,
      previous_plan: selectedPlanId,
      source: "remote",
    });
    setError(null);
    setOfferSessionId(null);
    setSelectedPlanId(planId);
  }

  function closePaymentModal() {
    track("checkout_modal_closed", { plan: selectedPlanId, source: "remote" });
    requestRef.current?.abort();
    setRedirecting(false);
    setModalOpen(false);
  }

  function acceptDeclineOffer(sessionId: string) {
    track("checkout_decline_offer_accepted", {
      plan: selectedPlanId,
      offer_plan: entryPlanId,
      source: "remote",
    });
    setOfferSessionId(sessionId);
    setSelectedPlanId(entryPlanId);
  }

  /** Fallback from the popup: Stripe-hosted payment page for the selected plan. */
  async function goToHostedPayment() {
    if (redirecting) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const planId = selectedPlanId;

    setRedirecting(true);
    setError(null);
    track("checkout_hosted_fallback_clicked", {
      plan: planId,
      source: "remote",
    });

    try {
      const data = await requestCheckoutSession(
        "/api/checkout",
        planId,
        controller.signal,
      );
      if (!data.url) {
        throw new Error(data.error ?? copy.errStart);
      }
      window.location.assign(data.url);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        isNetworkError(err)
          ? copy.errNetwork
          : err instanceof Error
            ? err.message
            : copy.errGeneric,
      );
      setRedirecting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[1600] flex items-end bg-black/60 animate-[remote-fade_0.25s_ease-out]"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choisis ton abonnement"
          className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border-t border-[#25252b] bg-[#0a0a0c] px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative mb-4">
            <div className="mx-auto h-[5px] w-10 rounded-full bg-[#303038]" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="absolute -top-0.5 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#1c1c21] text-[#8b8b94]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="pr-10 text-[22px] font-bold leading-tight text-[#f4f4f5]">
            Choisis ton abonnement
          </p>
          <p className="mt-1.5 text-[15px] leading-snug text-[#8b8b94]">
            Ta position à{" "}
            <span className="font-semibold text-[#f4f4f5]">{destination}</span>{" "}
            s&apos;active sur ton iPhone dès le paiement.
          </p>

          <div
            role="radiogroup"
            aria-label="Choisis ton plan"
            className="mt-5 space-y-2.5"
          >
            {plans.map((plan) => {
              const selected = plan.id === selectedPlan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectPlan(plan.id)}
                  className={cn(
                    "relative flex w-full items-center gap-3 rounded-2xl border bg-[#16161a] px-4 py-3.5 text-left transition",
                    plan.popular && "mt-4",
                    selected
                      ? "border-[#ec4899] ring-2 ring-[#ec4899]/30"
                      : "border-[#25252b]",
                  )}
                >
                  {plan.popular ? (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#ec4899] to-[#a855f7] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      {copy.popularBadge}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                      selected ? "border-[#ec4899]" : "border-[#3a3a42]",
                    )}
                  >
                    {selected && (
                      <span className="h-2.5 w-2.5 rounded-full bg-[#ec4899]" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-[#f4f4f5]">
                      {plan.name}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex items-center gap-1 text-xs",
                        plan.mobileApp
                          ? "font-semibold text-[#f472b6]"
                          : "text-[#8b8b94]",
                      )}
                    >
                      {plan.mobileApp ? (
                        <Smartphone className="h-3.5 w-3.5" />
                      ) : (
                        <Monitor className="h-3.5 w-3.5" />
                      )}
                      {plan.perk}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block whitespace-nowrap text-lg font-bold tabular-nums text-[#f4f4f5]">
                      {plan.perDay.replace("≈ ", "")} €
                      <span className="text-xs font-medium text-[#8b8b94]">
                        /jour
                      </span>
                    </span>
                    <span className="block whitespace-nowrap text-xs tabular-nums text-[#8b8b94]">
                      {plan.price.replace("€", " €")} /{" "}
                      {BILLING_PERIOD_LABELS[plan.id]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[#25252b] bg-[#16161a] p-3.5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#f472b6]" />
            <p className="text-[13px] leading-snug text-[#8b8b94]">
              <span className="font-semibold text-[#f4f4f5]">
                {GUARANTEE.badge}.
              </span>{" "}
              {GUARANTEE.title}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              track("checkout_continue_clicked", {
                plan: selectedPlan.id,
                source: "remote",
              });
              // The payment (popup or hosted page) then comes back to /app.
              document.cookie = `${CHECKOUT_RETURN_APP_COOKIE}=1; path=/; max-age=3600; samesite=lax`;
              setError(null);
              setModalOpen(true);
            }}
            data-track="remote_plans_continue"
            className="mt-5 flex h-12 w-full items-center justify-center rounded-[14px] bg-gradient-to-br from-[#ec4899] to-[#a855f7] text-base font-semibold text-white shadow-[0_6px_12px_rgba(236,72,153,0.4)] transition-transform duration-150 active:scale-[0.98]"
          >
            Continuer
          </button>
          {error ? (
            <p className="pt-2 text-center text-[13px] font-semibold text-[#f87171]">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {/* Outside the sheet: React events bubble through portals, and a click
          in the popup would otherwise reach the sheet's close handler. */}
      {modalOpen ? (
        <CheckoutPaymentModal
          // A new plan or the discount needs a new Stripe session: remount the popup.
          key={`${selectedPlan.id}:${offerSessionId ?? ""}`}
          plan={selectedPlan}
          offerPlan={entryPlan}
          offerSessionId={
            offerSessionId && selectedPlan.id === entryPlanId
              ? offerSessionId
              : undefined
          }
          onDeclineOffer={acceptDeclineOffer}
          stripePublishableKey={stripePublishableKey}
          hostedRedirecting={redirecting}
          hostedError={error}
          onHostedFallback={() => void goToHostedPayment()}
          onClose={closePaymentModal}
          zIndexClassName="z-[1700]"
        />
      ) : null}
    </>
  );
}
