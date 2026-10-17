"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHECKOUT_CTA_LABEL, DEFAULT_PLAN_ID, getOnboardingUrl } from "@/lib/constants";
import { OnboardingLink } from "@/components/onboarding/onboarding-link";
import { useHasSession } from "@/lib/use-has-session";

/**
 * "Connexion" and the CTA. On a phone "Connexion" shrinks to an icon, so the
 * CTA fits next to the logo with room to breathe. Someone already logged in
 * on this device gets a single "Mon espace" instead: the dashboard sorts out
 * the rest (paywall when there is no active subscription).
 */
export function HeaderActions() {
  const hasSession = useHasSession();

  if (hasSession) {
    return (
      <Link href="/dashboard" data-track="dashboard_link_clicked" data-track-location="header">
        <Button size="sm" className="whitespace-nowrap">
          Mon espace
        </Button>
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/login"
        aria-label="Connexion"
        data-track="login_link_clicked"
        data-track-location="header"
      >
        <Button variant="ghost" size="sm" className="w-9 px-0 sm:w-auto sm:px-4">
          <UserRound className="h-5 w-5 sm:hidden" />
          <span className="hidden sm:inline">Connexion</span>
        </Button>
      </Link>
      <OnboardingLink
        href={getOnboardingUrl(DEFAULT_PLAN_ID)}
        data-track="cta_clicked"
        data-track-location="header"
        data-track-plan={DEFAULT_PLAN_ID}
      >
        <Button size="sm" className="whitespace-nowrap">
          {CHECKOUT_CTA_LABEL}
        </Button>
      </OnboardingLink>
    </>
  );
}
