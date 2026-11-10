"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { CHECKOUT_COPY } from "@/lib/checkout-copy";
import type { Plan } from "@/lib/constants";
import { getPlanMonths } from "@/lib/price-display-experiment";
import {
  formatOrderPrice,
  getBillingCadence,
  getOrderPayToday,
  getOrderRenewalLine,
  getPerMonthPrice,
  getPeriodLabel,
  getSavingsPercent,
} from "@/lib/quiz-paywall";
import { cn } from "@/lib/utils";

// NOT RENDERED for now: the order page was removed from the quiz flow (the
// plan sheet's « Continuer » opens the payment popup directly). Kept, with its
// helpers in lib/quiz-paywall.ts and their tests, for the Pack Voyageur lot
// (add-ons), which will need an order step again.

/**
 * Slot for the optional add-ons of the order (lot 3: the « Pack Voyageur »),
 * between the plan card and the payment bar. Renders nothing until they exist:
 * no checkbox, no placeholder, never a price that isn't real.
 */
export function QuizOrderAddOns() {
  return null;
}

/**
 * Step 2 of the quiz arm's purchase, on /checkout?…&parcours=quiz: the plan
 * chosen in the quiz's plan sheet, its period switcher, the add-ons slot and
 * a payment bar at the bottom of the screen. State, payment popup and exit
 * offers stay in AnyLocCheckoutPanel; this only renders and reports taps.
 */
export function QuizOrder({
  plans,
  selectedPlan,
  referencePlan,
  planLine,
  welcomeOfferPrice,
  annualExitOfferPrice,
  onSelectPlan,
  onOrder,
}: {
  plans: readonly Plan[];
  selectedPlan: Plan;
  /** The one-month plan the savings are measured against. */
  referencePlan: Plan;
  /** Short line under the plan name: the quiz's reason for the recommended plan, else its perk. */
  planLine: string;
  /** "4,95 €" while the -50 % welcome offer applies to the selected plan. */
  welcomeOfferPrice?: string;
  /** "29 €" while the accepted annual exit offer applies. */
  annualExitOfferPrice?: string;
  onSelectPlan: (planId: string) => void;
  onOrder: () => void;
}) {
  const copy = CHECKOUT_COPY;
  const offers = { welcomeOfferPrice, annualExitOfferPrice };
  const months = getPlanMonths(selectedPlan.id);

  // One entrance for the whole page (see .paywall-rise in globals.css).
  const rise = (delay: 0 | 100 | 200) =>
    cn("paywall-rise", delay === 100 && "[animation-delay:100ms]", delay === 200 && "[animation-delay:200ms]");

  return (
    // Fills the screen under the header, so the payment bar rests at its bottom.
    <div className="flex min-h-[calc(100dvh-6.5rem)] flex-col sm:min-h-[calc(100dvh-9.25rem)]">
      <div className={cn("text-center", rise(0))}>
        <p className="text-xs font-bold uppercase tracking-widest text-pink-600">Dernière étape</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Ta commande
        </h1>
      </div>

      <section
        aria-label="Ta formule"
        className={cn(
          "mt-6 rounded-3xl border border-pink-300 bg-white p-4 shadow-lg shadow-pink-500/10 ring-1 ring-pink-500/10",
          rise(100)
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-zinc-900">{selectedPlan.name}</p>
            <p className="mt-0.5 text-sm leading-snug text-zinc-500">{planLine}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="whitespace-nowrap text-2xl font-bold tabular-nums text-zinc-900">
              {getPerMonthPrice(selectedPlan)} €
              <span className="ml-0.5 text-sm font-normal text-zinc-500">/mois</span>
            </p>
            <p className="mt-0.5 whitespace-nowrap text-xs tabular-nums text-zinc-500">
              {months > 1
                ? `${formatOrderPrice(selectedPlan.price)} ${getBillingCadence(selectedPlan.id)}`
                : "Sans engagement"}
            </p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label="Durée de ta formule"
          className="mt-4 grid grid-cols-3 gap-1 rounded-full bg-zinc-100 p-1"
        >
          {plans.map((plan) => {
            const selected = plan.id === selectedPlan.id;
            const savings =
              getPlanMonths(plan.id) === 12 ? getSavingsPercent(plan, referencePlan) : 0;
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelectPlan(plan.id)}
                className={cn(
                  "flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-1 text-sm font-semibold transition",
                  selected
                    ? "btn-gradient text-white shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                )}
              >
                {getPeriodLabel(plan.id)}
                {savings > 0 ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
                      selected ? "bg-white/25 text-white" : "bg-pink-100 text-pink-700"
                    )}
                  >
                    -{savings} %
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {welcomeOfferPrice ? (
          <p className="mt-3 text-center text-xs font-semibold text-pink-600">
            {copy.focusOfferNote}
          </p>
        ) : null}
      </section>

      <QuizOrderAddOns />

      {/* Pushes the bar to the bottom of the screen, and keeps a gap above it. */}
      <div aria-hidden className="min-h-8 flex-1" />

      {/* Stays at the bottom of the screen; on a long page (add-ons) it scrolls
          with it and rests at the end, so nothing is ever hidden under it. */}
      <div
        className={cn(
          "sticky bottom-0 z-20 -mx-4 border-t border-zinc-200/80 bg-white/90 px-4 pt-4 backdrop-blur-md sm:mx-0 sm:rounded-t-3xl sm:border-x sm:px-5",
          rise(200)
        )}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[15px] font-semibold text-zinc-900">À payer aujourd&apos;hui</p>
          <div className="text-right">
            <p className="text-2xl font-bold leading-none tabular-nums text-zinc-900">
              {getOrderPayToday(selectedPlan, offers)}
            </p>
            <p className="mt-1.5 text-xs tabular-nums text-zinc-500">
              {getOrderRenewalLine(selectedPlan, offers)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOrder}
          className="btn-gradient mt-4 flex h-14 w-full items-center justify-center rounded-full text-base font-bold text-white transition hover:opacity-90"
        >
          Commander maintenant
        </button>
        <p className="mt-2.5 flex items-center justify-center gap-1 text-[11px] text-zinc-500">
          <Lock className="h-3 w-3" aria-hidden />
          Paiement sécurisé · Carte bancaire · Apple Pay
        </p>
        <p className="mt-1 text-center text-[11px] text-zinc-400">
          En continuant, tu acceptes les{" "}
          <Link
            href="/conditions-generales"
            target="_blank"
            rel="noreferrer"
            className="underline transition hover:text-zinc-700"
          >
            conditions générales
          </Link>
        </p>
      </div>
    </div>
  );
}
