import type { Plan } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function formatPlanBillingTotal(plan: Plan) {
  return `${plan.price}${plan.period}`;
}

export function PlanPrice({
  plan,
  size = "card",
  align = "left",
  className,
}: {
  plan: Plan;
  size?: "card" | "summary" | "landing";
  align?: "left" | "right";
  className?: string;
}) {
  const headlineSize = {
    card: "text-2xl",
    summary: "text-2xl",
    landing: "text-4xl",
  }[size];

  const sublineSize = {
    card: "text-xs",
    summary: "text-xs",
    landing: "text-sm",
  }[size];

  return (
    <div className={cn(align === "right" && "text-right", className)}>
      <div
        className={cn(
          "flex items-baseline gap-1",
          align === "right" && "justify-end"
        )}
      >
        <span className={cn(headlineSize, "font-bold text-zinc-900")}>
          {plan.perMonth}
        </span>
        <span className={cn(sublineSize, "text-zinc-500")}>
          {plan.perMonthLabel}
        </span>
      </div>
      <p className={cn("mt-1", sublineSize, "text-zinc-500")}>
        {formatPlanBillingTotal(plan)}
      </p>
    </div>
  );
}
