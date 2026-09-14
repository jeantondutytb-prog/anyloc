"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { AnyLocCheckoutPanel } from "@/components/pricing/anyloc-checkout-panel";
import { Logo } from "@/components/ui/logo";
import { isValidPlanId } from "@/lib/constants";

function normalizeCheckoutPlan(planId: string) {
  return isValidPlanId(planId) ? planId : "annual";
}

export function CheckoutView({
  initialPlanId,
  canceled,
  stripePublishableKey,
}: {
  initialPlanId: string;
  canceled?: boolean;
  stripePublishableKey: string;
}) {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState(
    normalizeCheckoutPlan(initialPlanId)
  );

  function selectPlan(planId: string) {
    setSelectedPlanId(planId);
    router.replace(`/checkout?plan=${planId}`, { scroll: false });
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-[120px]" />
        <div className="absolute top-0 right-0 h-[300px] w-[400px] rounded-full bg-violet-500/10 blur-[100px]" />
      </div>

      <div className="relative border-b border-zinc-200 bg-logo-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
          <Logo nameClassName="text-base font-bold tracking-tight sm:text-lg" />
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
          >
            Accueil
          </Link>
        </div>
      </div>

      <main className="relative flex-1 py-10 sm:py-14">
        <AnyLocCheckoutPanel
          selectedPlanId={selectedPlanId}
          onPlanChange={selectPlan}
          stripePublishableKey={stripePublishableKey}
          canceled={canceled}
        />
      </main>

      <Footer />
    </div>
  );
}
