import { Check, Monitor, Smartphone, X } from "lucide-react";
import { PLAN_VALUE_STACK } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function PaywallValueStack({
  className,
  compact = false,
  showHeading = false,
  mobileApp,
}: {
  className?: string;
  compact?: boolean;
  showHeading?: boolean;
  /** Plan-specific line: mobile app included (annual) or desktop only. */
  mobileApp?: boolean;
}) {
  const iconSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const textSize = compact ? "text-xs" : "text-sm";

  return (
    <div className={className}>
      {showHeading && (
        <p
          className={cn(
            "font-semibold uppercase tracking-wide text-pink-600",
            compact ? "mb-2 text-[10px]" : "mb-3 text-xs"
          )}
        >
          Inclus dans ton abonnement
        </p>
      )}
      <ul className={cn("space-y-2", showHeading ? undefined : className)}>
      {mobileApp === true ? (
        <li
          className={cn(
            "-mx-2 flex items-start gap-2 rounded-lg bg-gradient-to-r from-pink-500/15 to-violet-500/10 px-2 py-1.5 font-bold text-zinc-900",
            compact ? "text-sm" : "text-base"
          )}
        >
          <Smartphone className={cn("mt-0.5 shrink-0 text-pink-600", compact ? "h-4 w-4" : "h-5 w-5")} />
          App mobile disponible — change de ville depuis ton tel
        </li>
      ) : null}
      {mobileApp === false ? (
        <li className={cn("flex items-start gap-2 font-medium text-zinc-700", textSize)}>
          <Monitor className={cn("mt-0.5 shrink-0 text-pink-600", iconSize)} />
          Sur PC et Mac
        </li>
      ) : null}
      {PLAN_VALUE_STACK.map((perk) => (
        <li
          key={perk}
          className={cn("flex items-start gap-2 text-zinc-700", textSize)}
        >
          <Check className={cn("mt-0.5 shrink-0 text-pink-600", iconSize)} />
          {perk}
        </li>
      ))}
      {mobileApp === false ? (
        <li className={cn("flex items-start gap-2 text-zinc-400", textSize)}>
          <X className={cn("mt-0.5 shrink-0 text-zinc-400", iconSize)} />
          App mobile non disponible
        </li>
      ) : null}
      </ul>
    </div>
  );
}
