import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-pink-500/25 bg-pink-500/10 px-3 py-1 text-xs font-medium text-pink-300",
        className
      )}
    >
      {children}
    </span>
  );
}
