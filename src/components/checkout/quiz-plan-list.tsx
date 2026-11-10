"use client";

import { useState } from "react";
import { Check, Lock, Plus, ShieldCheck, TrendingDown } from "lucide-react";
import { GuaranteeSheet } from "@/components/checkout/guarantee-sheet";
import { CHECKOUT_COPY } from "@/lib/checkout-copy";
import { getWorryReassurance } from "@/lib/onboarding-quiz";
import type { Plan } from "@/lib/constants";
import { getPlanMonths } from "@/lib/price-display-experiment";
import { getPayTodayLine, getPerMonthPrice, getPlanValueCard } from "@/lib/quiz-paywall";
import { cn } from "@/lib/utils";

/**
 * The pinned « Continuer avec … » button of the plan picker, with the amount
 * due today and the payment reassurance. Shared by the quiz's plan sheet and
 * the plan list page of /checkout (after the payment popup is closed).
 */
export function QuizPlanCta({
  plan,
  worry,
  onContinue,
}: {
  plan: Plan;
  /** The worry picked in the quiz: its reassurance line sits just above the button. */
  worry?: string;
  onContinue: () => void;
}) {
  // A 1-month plan's value card already is the 48 h guarantee: don't say it twice.
  const repeatsValueCard = worry === "price" && getPlanMonths(plan.id) <= 1;
  const reassurance = repeatsValueCard ? null : getWorryReassurance(worry);
  return (
    <>
      {reassurance ? (
        <p className="mb-2.5 flex items-center justify-center gap-1.5 text-center text-sm text-zinc-700">
          <ShieldCheck className="h-4 w-4 shrink-0 text-pink-500" aria-hidden />
          {reassurance}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onContinue}
        className="btn-gradient flex h-12 w-full items-center justify-center rounded-full text-[15px] font-bold text-white transition hover:opacity-90"
      >
        Continuer avec {plan.name}
      </button>
      <p className="mt-2 text-center text-xs text-zinc-500">{getPayTodayLine(plan)}</p>
      <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-zinc-400">
        <Lock className="h-3 w-3" aria-hidden />
        Paiement sécurisé · Carte bancaire · Apple Pay
      </p>
    </>
  );
}

/**
 * The plan picker of visitors coming from the quiz, shown in the sheet that
 * opens over the quiz's ready screen (components/onboarding/quiz-plans-sheet)
 * and as the page of /checkout behind the payment popup: title, plans, one value card, what the plan unlocks, questions, fine print.
 * Renders and reports taps only; the parent owns the selection and the CTA.
 */
export function QuizPlanList({
  title,
  titleId,
  plans,
  selectedPlan,
  referencePlan,
  recommendedPlanId,
  recommendationReason,
  welcomeOfferPrice,
  onSelectPlan,
}: {
  title: { before: string; highlight: string; after: string };
  /** Id of the title, for the dialog's aria-labelledby. */
  titleId?: string;
  plans: readonly Plan[];
  selectedPlan: Plan;
  /** The one-month plan the savings are measured against. */
  referencePlan: Plan;
  recommendedPlanId?: string;
  recommendationReason?: string;
  /** "4,95 €" while the -50 % welcome offer applies to the selected plan. */
  welcomeOfferPrice?: string;
  onSelectPlan: (planId: string) => void;
}) {
  const copy = CHECKOUT_COPY;
  const [guaranteeOpen, setGuaranteeOpen] = useState(false);
  const valueCard = getPlanValueCard(selectedPlan, referencePlan);
  const ValueIcon = valueCard.kind === "guarantee" ? ShieldCheck : TrendingDown;
  const unlocked = [selectedPlan.perk, ...selectedPlan.features];

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
      <h2
        id={titleId}
        className="text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl"
      >
        {title.before} <span className="gradient-text">{title.highlight}</span>
        {title.after}
      </h2>
      <p className="mt-2 text-center text-sm text-zinc-500">
        Choisis ta formule : ta position est déjà prête.
      </p>

      <div role="radiogroup" aria-label="Choisis ton plan" className="mt-6 space-y-2.5">
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
                {/* Only lines that help choose: the recommendation or the mobile app
                    (« Sur PC et Mac » was noise on the cards). */}
                {recommended && recommendationReason ? (
                  <span className="mt-0.5 block text-xs leading-snug text-zinc-500">
                    {recommendationReason}
                  </span>
                ) : plan.mobileApp ? (
                  <span className="mt-0.5 block text-xs leading-snug text-zinc-500">{plan.perk}</span>
                ) : null}
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

      <div className="mt-4">
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

        <h3 className="mt-9 text-base font-semibold text-zinc-900">
          Ce que tu débloques avec {selectedPlan.name}
        </h3>
        <ul className="mt-3 space-y-2.5">
          {unlocked.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <h3 className="mt-9 text-base font-semibold text-zinc-900">Tes questions</h3>
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

      <GuaranteeSheet open={guaranteeOpen} onClose={() => setGuaranteeOpen(false)} />
    </div>
  );
}
