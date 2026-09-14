"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { AnyLocCheckoutPanel } from "@/components/pricing/anyloc-checkout-panel";
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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 sm:pt-28 sm:pb-24">
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
