import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const PENDING_LABEL = "En cours de complétion";

export function PendingBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={cn(
        "border-zinc-200 bg-zinc-100 text-zinc-500",
        className
      )}
    >
      En cours
    </Badge>
  );
}

export function PendingValue({
  label = PENDING_LABEL,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn("italic text-zinc-400", className)}>{label}</span>
  );
}
