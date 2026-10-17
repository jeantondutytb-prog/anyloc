"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHECKOUT_CTA_LABEL, DEFAULT_PLAN_ID, getOnboardingUrl } from "@/lib/constants";
import { OnboardingLink } from "@/components/onboarding/onboarding-link";
import { useHasSession } from "@/lib/use-has-session";

/**
 * The landing's main CTA. Someone already logged in on this device goes
 * straight to the dashboard instead of the onboarding.
 */
export function MainCta({ location, className }: { location: string; className?: string }) {
  const hasSession = useHasSession();

  if (hasSession) {
    return (
      <Link href="/dashboard" data-track="dashboard_link_clicked" data-track-location={location}>
        <Button size="lg" className={className}>
          Accéder à mon espace
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    );
  }

  return (
    <OnboardingLink
      href={getOnboardingUrl(DEFAULT_PLAN_ID)}
      data-track="cta_clicked"
      data-track-location={location}
      data-track-plan={DEFAULT_PLAN_ID}
    >
      <Button size="lg" className={className}>
        {CHECKOUT_CTA_LABEL}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </OnboardingLink>
  );
}
