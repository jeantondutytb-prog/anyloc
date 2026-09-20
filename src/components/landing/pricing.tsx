import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrialCtaLink } from "@/components/navigation/trial-cta-link";
import { getOnboardingUrl, PLANS } from "@/lib/constants";
import { PaywallValueStack } from "@/components/pricing/paywall-value-stack";
import { PlanPrice } from "@/components/pricing/plan-price";
import { RefundGuaranteeNotice } from "@/components/pricing/refund-guarantee-notice";
import { TRIAL_CTA_SUBLINE, TRIAL_SELECT_SUBLINE } from "@/lib/trial";

export function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Choisis ta durée
          </h2>
          <p className="mt-4 text-zinc-600">{TRIAL_SELECT_SUBLINE}</p>
          <p className="mt-2 text-sm font-medium text-pink-600">
            {TRIAL_CTA_SUBLINE}
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col p-6 ${
                plan.popular
                  ? "border-pink-500/40 bg-gradient-to-b from-pink-500/10 to-violet-500/5 ring-1 ring-pink-500/25"
                  : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Le plus populaire
                </Badge>
              )}
              {plan.badge && !plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {plan.badge}
                </Badge>
              )}

              <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
              <p className="mt-1 text-xs font-medium text-zinc-500">
                Accès Anyloc complet
              </p>
              <PlanPrice plan={plan} size="landing" className="mt-4" />
              {plan.savings && (
                <p className="mt-1 text-sm text-pink-600">{plan.savings}</p>
              )}
              {plan.compare && !plan.savings && (
                <p className="mt-1 text-xs text-zinc-500">{plan.compare}</p>
              )}
              <p className="mt-2 text-sm text-zinc-500">{plan.description}</p>

              <PaywallValueStack
                className="mt-5 flex-1 border-t border-zinc-100 pt-5"
                compact
                showHeading
              />

              <TrialCtaLink
                href={getOnboardingUrl(plan.id)}
                label={plan.ctaLabel}
                variant={plan.popular ? "default" : "secondary"}
                showArrow={false}
                className="mt-6 block"
                buttonClassName="w-full"
              />
            </Card>
          ))}
        </div>

        <RefundGuaranteeNotice className="mt-8 text-center text-sm text-zinc-600" />
      </div>
    </section>
  );
}
