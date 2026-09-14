import { formatPlanBillingTotal, PlanPrice } from "@/components/pricing/plan-price";
import { Card } from "@/components/ui/card";
import { PLANS, type Plan } from "@/lib/constants";
import { TRIAL_HEADLINE } from "@/lib/trial";
import { cn } from "@/lib/utils";

export function getPlanById(planId: string) {
  return PLANS.find((plan) => plan.id === planId) ?? PLANS.find((plan) => plan.id === "annual")!;
}

export function PlanSummaryCard({
  plan,
  className,
  sticky = false,
  showTrialNote = false,
}: {
  plan: Plan;
  className?: string;
  sticky?: boolean;
  showTrialNote?: boolean;
}) {
  return (
    <Card
      className={cn(
        "border-pink-200/80 bg-gradient-to-b from-pink-50/80 to-white p-4 shadow-sm",
        sticky && "sticky top-4 z-10",
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">
        Formule sélectionnée
      </p>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-zinc-900">{plan.name}</p>
          <p className="mt-1 text-sm text-zinc-600">{formatPlanBillingTotal(plan)}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">{plan.billedNote}</p>
        </div>
        <PlanPrice plan={plan} size="summary" align="right" className="shrink-0" />
      </div>
      {showTrialNote ? (
        <p className="mt-4 rounded-xl border border-pink-100 bg-white/80 px-3 py-2 text-xs leading-relaxed text-zinc-600">
          {TRIAL_HEADLINE}
        </p>
      ) : null}
    </Card>
  );
}
