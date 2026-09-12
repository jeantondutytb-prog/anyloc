import { Check } from "lucide-react";
import { PLAN_VALUE_STACK } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function PaywallValueStack({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <ul className={cn("space-y-2", className)}>
      {PLAN_VALUE_STACK.map((perk) => (
        <li
          key={perk}
          className={cn(
            "flex items-start gap-2 text-zinc-700",
            compact ? "text-xs" : "text-sm"
          )}
        >
          <Check
            className={cn(
              "mt-0.5 shrink-0 text-pink-600",
              compact ? "h-3.5 w-3.5" : "h-4 w-4"
            )}
          />
          {perk}
        </li>
      ))}
    </ul>
  );
}
