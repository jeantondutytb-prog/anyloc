import { CHECKOUT_COPY } from "@/lib/checkout-copy";
import { cn } from "@/lib/utils";

/** The Black Friday banner above the plans: paywall, checkout and the quiz's plan sheet. */
export function BlackFridayBanner({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "rounded-xl border border-zinc-900 bg-zinc-950 px-4 py-3 text-center text-sm text-white",
        className
      )}
    >
      <span className="font-bold">{CHECKOUT_COPY.blackFridayBannerTitle}</span>
      {CHECKOUT_COPY.blackFridayBannerRest}
    </p>
  );
}
