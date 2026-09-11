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
  const amountSize = {
    card: "text-2xl",
    summary: "text-2xl",
    landing: "text-4xl sm:text-5xl",
  }[size];

  const unitSize = {
    card: "text-sm",
    summary: "text-xs",
    landing: "text-base",
  }[size];

  const sublineSize = {
    card: "text-sm",
    summary: "text-xs",
    landing: "text-sm",
  }[size];

  return (
    <div className={cn(align === "right" && "text-right", className)}>
      <div
        className={cn(
          "flex items-baseline gap-1 whitespace-nowrap",
          align === "right" && "justify-end"
        )}
      >
        <span
          className={cn(
            amountSize,
            "font-bold tabular-nums tracking-tight text-zinc-900"
          )}
        >
          {plan.perDay}
        </span>
        <span className={cn(unitSize, "font-medium text-zinc-500")}>
          {plan.perDayLabel}
        </span>
      </div>
      <p className={cn("mt-1", sublineSize, "text-zinc-500")}>
        {formatPlanBillingTotal(plan)}
      </p>
    </div>
  );
}
