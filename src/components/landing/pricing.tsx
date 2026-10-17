"use client";

import { useSyncExternalStore } from "react";
import { Check, Monitor, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CHECKOUT_SELECT_SUBLINE,
  getGridPlans,
  getOnboardingUrl,
  PLAN_VALUE_STACK,
} from "@/lib/constants";
import { readPricingVariantCookie } from "@/lib/pricing-experiment";
import { PlanPrice } from "@/components/pricing/plan-price";
import { RefundPolicyNotice } from "@/components/pricing/refund-policy-notice";
import { OnboardingLink } from "@/components/onboarding/onboarding-link";

function subscribeToNothing() {
  return () => {};
}

export function Pricing() {
  // The price grid of this visitor's pricing A/B variant (cookie set by the
  // proxy). Rendered with the current grid on the server: the section is far
  // below the fold, so the swap after hydration isn't seen.
  const variant = useSyncExternalStore(
    subscribeToNothing,
    readPricingVariantCookie,
    () => "control" as const
  );
  const plans = getGridPlans(variant === "grid_v2" ? "v2" : "v1");

  return (
    <section id="pricing" data-track-section="pricing" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Choisis ta durée
          </h2>
          <p className="mt-4 text-zinc-600">{CHECKOUT_SELECT_SUBLINE}</p>
        </div>

        {/* What every plan includes, said once instead of on each card. */}
        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 lg:max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">
            Inclus dans tous les plans
          </p>
          <ul className="mt-3 grid gap-2 lg:grid-cols-2 lg:gap-x-8">
            {PLAN_VALUE_STACK.map((perk) => (
              <li key={perk} className="flex items-start gap-2 text-sm text-zinc-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" />
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col p-6 ${
                plan.popular
                  ? // The recommended plan comes first on a phone, where the cards stack.
                    "order-first border-pink-500/40 bg-gradient-to-b from-pink-500/10 to-violet-500/5 ring-1 ring-pink-500/25 lg:order-none"
                  : ""
              }`}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {plan.badge}
                </Badge>
              )}

              <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
              <PlanPrice plan={plan} size="landing" className="mt-4" />
              {plan.savings && (
                <p className="mt-1 text-sm text-pink-600">{plan.savings}</p>
              )}
              {plan.compare && !plan.savings && (
                <p className="mt-1 text-xs text-zinc-500">{plan.compare}</p>
              )}
              <p className="mt-2 text-sm text-zinc-500">{plan.description}</p>

              {/* Only what differs between plans; the rest is listed once above. */}
              <ul className="mt-5 flex-1 space-y-2 border-t border-zinc-100 pt-5 text-sm">
                <li className="flex items-start gap-2 font-semibold text-zinc-900">
                  {plan.mobileApp ? (
                    <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" />
                  ) : (
                    <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" />
                  )}
                  {plan.perk}
                </li>
                {!plan.mobileApp && (
                  <li className="flex items-start gap-2 text-zinc-400">
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    App mobile non disponible
                  </li>
                )}
              </ul>

              <OnboardingLink
                href={getOnboardingUrl(plan.id)}
                className="mt-6 block"
                data-track="cta_clicked"
                data-track-location="pricing"
                data-track-plan={plan.id}
              >
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "secondary"}
                >
                  {plan.ctaLabel}
                </Button>
              </OnboardingLink>
            </Card>
          ))}
        </div>

        <RefundPolicyNotice className="mt-8 text-center text-sm text-zinc-600" />
      </div>
    </section>
  );
}
