"use client";

import { QuizPlanCta, QuizPlanList } from "@/components/checkout/quiz-plan-list";
import type { Plan } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * The plan list of visitors from the quiz, rendered as the page of
 * /checkout?…&parcours=quiz: the same list as the quiz's plan sheet, with its
 * « Continuer avec … » button pinned at the bottom of the screen. It sits
 * behind the payment popup, which opens on arrival from the sheet; closing the
 * popup lands here. State, popup and exit offers stay in AnyLocCheckoutPanel.
 */
export function QuizPlanPage({
  title,
  plans,
  selectedPlan,
  referencePlan,
  recommendedPlanId,
  recommendationReason,
  worry,
  welcomeOfferPrice,
  hidden,
  onSelectPlan,
  onContinue,
}: {
  title: { before: string; highlight: string; after: string };
  plans: readonly Plan[];
  selectedPlan: Plan;
  referencePlan: Plan;
  recommendedPlanId?: string;
  recommendationReason?: string;
  worry?: string;
  welcomeOfferPrice?: string;
  /** Invisible until the popup is up, so arriving from the sheet shows no intermediate page. */
  hidden?: boolean;
  onSelectPlan: (planId: string) => void;
  onContinue: () => void;
}) {
  return (
    // Fills the screen under the header, so the button rests at its bottom.
    <div
      className={cn(
        "flex min-h-[calc(100dvh-6.5rem)] flex-col sm:min-h-[calc(100dvh-9.25rem)]",
        hidden && "invisible"
      )}
    >
      <div className="flex-1 pb-6">
        <QuizPlanList
          title={title}
          plans={plans}
          selectedPlan={selectedPlan}
          referencePlan={referencePlan}
          recommendedPlanId={recommendedPlanId}
          recommendationReason={recommendationReason}
          welcomeOfferPrice={welcomeOfferPrice}
          onSelectPlan={onSelectPlan}
        />
      </div>
      <div
        className="sticky bottom-0 z-20 -mx-4 border-t border-zinc-200/80 bg-white/90 px-4 pt-3 backdrop-blur-md sm:mx-0 sm:rounded-t-3xl sm:border-x sm:px-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <QuizPlanCta plan={selectedPlan} worry={worry} onContinue={onContinue} />
      </div>
    </div>
  );
}
