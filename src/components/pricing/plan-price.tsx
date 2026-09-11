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
    card: "text-3xl",
    summary: "text-2xl",
    landing: "text-5xl",
  }[size];

  const sublineSize = {
    card: "text-sm",
    summary: "text-xs",
    landing: "text-sm",
  }[size];

  const periodSize = {
    card: "text-sm",
    summary: "text-xs",
    landing: "text-base",
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
          {plan.perDay}
        </span>
        <span className={cn(periodSize, "font-medium text-zinc-500")}>
          {plan.perDayLabel}
        </span>
      </div>
      <p className={cn("mt-1", sublineSize, "text-zinc-500")}>
        {formatPlanBillingTotal(plan)}
      </p>
    </div>
  );
}
