"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque } from "next/font/google";
import { Footer } from "@/components/layout/footer";
import { LocaflexCheckoutPanel } from "@/components/pricing/locaflex-checkout-panel";
import { Logo } from "@/components/ui/logo";
import { LOCAFLEX_CHECKOUT_PLAN_IDS } from "@/lib/checkout-locaflex-copy";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
});

function normalizeCheckoutPlan(planId: string) {
  return LOCAFLEX_CHECKOUT_PLAN_IDS.includes(
    planId as (typeof LOCAFLEX_CHECKOUT_PLAN_IDS)[number]
  )
    ? planId
    : "annual";
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
    <div
      className={`${display.variable} flex min-h-screen flex-col bg-white text-[#0b0b0f]`}
      style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
    >
      <div className="border-b border-[#e7e7ea] bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-5">
          <Logo nameClassName="text-base font-extrabold tracking-tight sm:text-lg" />
          <Link
            href="/"
            className="text-sm font-semibold text-[#5b5b66] transition hover:text-[#0b0b0f]"
          >
            Accueil
          </Link>
        </div>
      </div>

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <LocaflexCheckoutPanel
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
