"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { PaywallCheckoutPanel } from "@/components/pricing/paywall-checkout-panel";
import { Logo } from "@/components/ui/logo";

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
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);

  function selectPlan(planId: string) {
    setSelectedPlanId(planId);
    router.replace(`/checkout?plan=${planId}`, { scroll: false });
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-pink-500/8 blur-[120px]" />
        <div className="absolute top-32 right-0 h-[280px] w-[360px] rounded-full bg-violet-500/8 blur-[100px]" />
      </div>

      <header className="relative z-20 border-b border-zinc-200 bg-logo-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Logo nameClassName="text-base font-bold tracking-tight sm:text-lg" />
          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-6 sm:flex">
              <Link
                href="/#features"
                className="text-sm text-zinc-600 transition hover:text-zinc-900"
              >
                Fonctionnalités
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-zinc-600 transition hover:text-zinc-900"
              >
                Tarifs
              </Link>
            </nav>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Accueil
            </Link>
          </div>
        </div>
      </header>

      <main className="relative flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <PaywallCheckoutPanel
            selectedPlanId={selectedPlanId}
            onPlanChange={selectPlan}
            stripePublishableKey={stripePublishableKey}
            canceled={canceled}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
