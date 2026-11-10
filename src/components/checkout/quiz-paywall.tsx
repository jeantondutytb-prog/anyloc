"use client";

import { useState } from "react";
import { Check, Lock, Plus, ShieldCheck, TrendingDown } from "lucide-react";
import { GuaranteeSheet } from "@/components/checkout/guarantee-sheet";
import { CHECKOUT_COPY } from "@/lib/checkout-copy";
import type { Plan } from "@/lib/constants";
import { getPayTodayLine, getPerMonthPrice, getPlanValueCard } from "@/lib/quiz-paywall";
import { cn } from "@/lib/utils";

/**
 * The paywall of visitors arriving from the quiz: a calm single column (title,
 * plans, one value card, what the plan unlocks, questions) and a payment bar
 * that stays at the bottom of the screen. State, payment popup and exit offers
 * stay in AnyLocCheckoutPanel; this only renders and reports taps.
 */
export function QuizPaywall({
  title,
  plans,
  selectedPlan,
  referencePlan,
  recommendedPlanId,
  recommendationReason,
  welcomeOfferPrice,
  onSelectPlan,
  onContinue,
}: {
  title: { before: string; highlight: string; after: string };
  plans: readonly Plan[];
  selectedPlan: Plan;
  /** The one-month plan the savings are measured against. */
  referencePlan: Plan;
  recommendedPlanId?: string;
  recommendationReason?: string;
  /** "4,95 €" while the -50 % welcome offer applies to the selected plan. */
  welcomeOfferPrice?: string;
  onSelectPlan: (planId: string) => void;
  onContinue: () => void;
}) {
  const copy = CHECKOUT_COPY;
  const [guaranteeOpen, setGuaranteeOpen] = useState(false);
  const valueCard = getPlanValueCard(selectedPlan, referencePlan);
  const ValueIcon = valueCard.kind === "guarantee" ? ShieldCheck : TrendingDown;
  const unlocked = [selectedPlan.perk, ...selectedPlan.features];

  // One entrance for the whole page (see .paywall-rise in globals.css).
  const rise = (delay: 0 | 100 | 200 | 300) =>
    cn("paywall-rise", delay === 100 && "[animation-delay:100ms]", delay === 200 && "[animation-delay:200ms]", delay === 300 && "[animation-delay:300ms]");

  const valueCardContent = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 text-white">
        <ValueIcon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold leading-snug text-zinc-900">
          {valueCard.title}
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-zinc-500">{valueCard.text}</span>
      </span>
    </>
  );
  const valueCardClassName = "flex w-full items-start gap-3 rounded-2xl bg-zinc-50 p-4 text-left";

  return (
    <div>
      <div className={rise(0)}>
        <h1 className="text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {title.before} <span className="gradient-text">{title.highlight}</span>
          {title.after}
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Choisis ta formule : ta position est déjà prête.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Choisis ton plan"
        className={cn("mt-6 space-y-2.5", rise(100))}
      >
        {plans.map((plan) => {
          const selected = plan.id === selectedPlan.id;
          const recommended = plan.id === recommendedPlanId;
          return (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelectPlan(plan.id)}
              className={cn(
                "relative flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-4 text-left transition",
                recommended && "mt-4",
                selected
                  ? "border-pink-500 ring-2 ring-pink-500/25"
                  : "border-zinc-200 hover:border-zinc-300"
              )}
            >
              {recommended ? (
                <span className="absolute -top-2.5 left-4 whitespace-nowrap rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  Idéal pour toi
                </span>
              ) : null}
              <span
                aria-hidden
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                  selected ? "border-pink-500" : "border-zinc-300"
                )}
              >
                {selected && <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-900">
                  {plan.name}
                  {plan.badge ? (
                    <span className="rounded-full bg-pink-100 px-1.5 py-px text-[10px] font-bold text-pink-700">
                      {plan.badge}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-zinc-500">
                  {recommended && recommendationReason ? recommendationReason : plan.perk}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block whitespace-nowrap text-lg font-semibold tabular-nums text-zinc-900">
                  {getPerMonthPrice(plan)} €
                  <span className="ml-0.5 text-xs font-normal text-zinc-500">/mois</span>
                </span>
                <span className="mt-0.5 block whitespace-nowrap text-xs tabular-nums text-zinc-500">
                  soit {plan.perDay.replace("≈ ", "")} €/jour
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={cn("mt-4", rise(200))}>
        {valueCard.kind === "guarantee" ? (
          <button
            type="button"
            onClick={() => setGuaranteeOpen(true)}
            data-track="checkout_guarantee_conditions_clicked"
            className={cn(valueCardClassName, "transition active:bg-zinc-100")}
          >
            {valueCardContent}
          </button>
        ) : (
          <div className={valueCardClassName}>{valueCardContent}</div>
        )}
        {welcomeOfferPrice ? (
          <p className="mt-2 text-center text-xs font-semibold text-pink-600">
            {copy.focusOfferNote}
          </p>
        ) : null}

        <h2 className="mt-9 text-base font-semibold text-zinc-900">
          Ce que tu débloques avec {selectedPlan.name}
        </h2>
        <ul className="mt-3 space-y-2.5">
          {unlocked.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className={rise(300)}>
        <h2 className="mt-9 text-base font-semibold text-zinc-900">Tes questions</h2>
        <div className="mt-2 divide-y divide-zinc-200 border-y border-zinc-200">
          {copy.faq.map((item) => (
            <details key={item.q} className="group py-3.5 text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-zinc-900 [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-2 leading-relaxed text-zinc-500">{item.a}</p>
            </details>
          ))}
        </div>

        <p className="mt-5 px-2 text-center text-xs leading-relaxed text-zinc-400">
          Renouvellement automatique au prix affiché jusqu&apos;à résiliation. Résiliable en 1 clic
          depuis ton espace.
        </p>
      </div>

      {/* Stays at the bottom of the screen while the page scrolls under it, and
          rests at the end of the page, so the last question is never hidden. */}
      <div
        className={cn(
          "sticky bottom-0 z-20 -mx-4 mt-6 bg-background px-4 pt-3 sm:mx-0 sm:px-0",
          "before:pointer-events-none before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-gradient-to-t before:from-background before:to-transparent",
          rise(300)
        )}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <button
          type="button"
          onClick={onContinue}
          className="btn-gradient flex h-12 w-full items-center justify-center rounded-full text-[15px] font-bold text-white transition hover:opacity-90"
        >
          Continuer avec {selectedPlan.name}
        </button>
        <p className="mt-2 text-center text-xs text-zinc-500">
          {getPayTodayLine(selectedPlan, welcomeOfferPrice)}
        </p>
        <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-zinc-400">
          <Lock className="h-3 w-3" aria-hidden />
          Paiement sécurisé · Carte bancaire · Apple Pay
        </p>
      </div>

      <GuaranteeSheet open={guaranteeOpen} onClose={() => setGuaranteeOpen(false)} />
    </div>
  );
}
