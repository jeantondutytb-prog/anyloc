import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
