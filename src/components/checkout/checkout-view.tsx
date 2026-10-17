"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnyLocCheckoutPanel } from "@/components/pricing/anyloc-checkout-panel";
import { Logo } from "@/components/ui/logo";
import type { ReturningCustomer } from "@/lib/checkout-copy";
import { DEFAULT_PLAN_ID, isValidPlanId } from "@/lib/constants";
import {
  ONBOARDING_DESTINATION_KEY,
  type OnboardingDestination,
} from "@/lib/onboarding-destinations";

// The paywall keeps only what a buyer may need: the legal pages and support.
const CHECKOUT_FOOTER_LINKS = [
  { label: "CGV", href: "/conditions-generales" },
  { label: "Remboursement", href: "/politique-de-remboursement" },
  { label: "Confidentialité", href: "/politique-de-confidentialite" },
  { label: "Contact", href: "/contact" },
];

function normalizeCheckoutPlan(planId: string) {
  return isValidPlanId(planId) ? planId : DEFAULT_PLAN_ID;
}

export function CheckoutView({
  initialPlanId,
  canceled,
  stripePublishableKey,
  recoveryOffer,
  focusPayment: initialFocusPayment,
  returning,
}: {
  initialPlanId: string;
  canceled?: boolean;
  stripePublishableKey: string;
  recoveryOffer?: boolean;
  focusPayment?: boolean;
  returning?: ReturningCustomer | null;
}) {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState(
    normalizeCheckoutPlan(initialPlanId)
  );
  const [destination, setDestination] = useState<OnboardingDestination | undefined>();
  const [focusPayment, setFocusPayment] = useState(Boolean(initialFocusPayment));

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(ONBOARDING_DESTINATION_KEY);
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after hydration
        setDestination(JSON.parse(stored) as OnboardingDestination);
      }
    } catch {
      setDestination(undefined);
    }
  }, []);

  function selectPlan(planId: string) {
    setSelectedPlanId(planId);
    router.replace(`/checkout?plan=${planId}`, { scroll: false });
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-[120px]" />
        <div className="absolute top-0 right-0 h-[300px] w-[400px] rounded-full bg-violet-500/10 blur-[100px]" />
      </div>

      {/* Same floating pill as the landing header. No way back to the landing
          from here: it was the main exit of the paywall. */}
      <div className="relative px-2 pt-2 sm:px-4 sm:pt-3">
        <div className="mx-auto flex h-14 max-w-md items-center justify-center rounded-full border border-zinc-200/80 bg-white/85 px-3 shadow-lg shadow-zinc-900/5 backdrop-blur-md sm:px-4">
          <Logo href={null} />
        </div>
      </div>

      {/* Same entrance as the signup card, so arriving from auth (or Google) eases in. */}
      <main className="animate-auth-enter relative flex-1 py-5 sm:py-10">
        <AnyLocCheckoutPanel
          selectedPlanId={selectedPlanId}
          onPlanChange={selectPlan}
          stripePublishableKey={stripePublishableKey}
          destination={destination}
          canceled={canceled}
          recoveryOffer={recoveryOffer}
          focusPayment={focusPayment}
          onShowAllPlans={() => setFocusPayment(false)}
          returning={returning}
        />
      </main>

      <footer className="relative px-4 py-5">
        <nav className="mx-auto flex max-w-lg flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span>© {new Date().getFullYear()} Anyloc</span>
          {CHECKOUT_FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-zinc-900">
              {link.label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}
