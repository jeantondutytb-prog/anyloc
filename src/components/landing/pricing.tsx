import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CHECKOUT_SELECT_SUBLINE,
  getOnboardingUrl,
  PLAN_VALUE_STACK,
  PLANS,
} from "@/lib/constants";
import { PlanPrice } from "@/components/pricing/plan-price";
import { RefundPolicyNotice } from "@/components/pricing/refund-policy-notice";
import { OnboardingLink } from "@/components/onboarding/onboarding-link";
import { cn } from "@/lib/utils";

export function Pricing() {
  return (
    <section id="pricing" data-track-section="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Choisis ta durée
          </h2>
          <p className="mt-4 text-zinc-600">{CHECKOUT_SELECT_SUBLINE}</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col p-5",
                plan.popular && "border-pink-500/50 ring-1 ring-pink-500/30"
              )}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 right-4">{plan.badge}</Badge>
              )}

              <h3 className="font-semibold text-zinc-900">{plan.name}</h3>
              <PlanPrice plan={plan} size="landing" className="mt-3" />
              <p className="mt-1 text-sm text-zinc-500">
                {plan.savings ?? plan.compare}
              </p>
              {plan.mobileApp && (
                <p className="mt-3 text-sm font-medium text-pink-700">
                  App mobile incluse
                </p>
              )}

              <OnboardingLink
                href={getOnboardingUrl(plan.id)}
                className="mt-auto block pt-5"
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

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="font-semibold text-zinc-900">Dans tous les plans</h3>
            <ul className="mt-3 space-y-2">
              {PLAN_VALUE_STACK.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm text-zinc-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900">L&apos;app mobile</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-700">
              Avec l&apos;Annuel, tu changes de ville directement depuis
              l&apos;app sur ton tel. Avec le Mensuel et le 6 mois, tu le fais
              depuis ton PC ou ton Mac.
            </p>
          </div>
        </div>

        <RefundPolicyNotice className="mt-10 text-sm text-zinc-600" />
      </div>
    </section>
  );
}
