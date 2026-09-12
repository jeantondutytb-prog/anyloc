import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOnboardingUrl, PLANS } from "@/lib/constants";
import { PaywallValueStack } from "@/components/pricing/paywall-value-stack";
import { PlanPrice } from "@/components/pricing/plan-price";
import { RefundGuaranteeNotice } from "@/components/pricing/refund-guarantee-notice";
import { getTrialCtaLabel } from "@/lib/trial";

export function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Choisis ton plan
          </h2>
          <p className="mt-4 text-zinc-600">
            {getTrialCtaLabel()} sur tous les plans. Garantie 48 h si le GPS ne
            fonctionne pas après installation.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
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
              <PlanPrice plan={plan} size="landing" className="mt-4" />
              {plan.savings && (
                <p className="mt-1 text-sm text-pink-600">{plan.savings}</p>
              )}
              <p className="mt-2 text-sm text-zinc-500">{plan.description}</p>

              <Link href={getOnboardingUrl(plan.id)} className="mt-8 block">
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "secondary"}
                >
                  {plan.ctaLabel}
                </Button>
              </Link>
            </Card>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-zinc-200 bg-zinc-50/80 px-6 py-5">
          <p className="text-center text-sm font-semibold text-zinc-900">
            Inclus dans tous les plans
          </p>
          <PaywallValueStack className="mt-4" />
        </div>

        <RefundGuaranteeNotice className="mt-8 text-center text-sm text-zinc-600" />
      </div>
    </section>
  );
}
