import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOnboardingUrl, PLANS } from "@/lib/constants";
import { PlanPrice } from "@/components/pricing/plan-price";
import { RefundGuaranteeNotice } from "@/components/pricing/refund-guarantee-notice";

export function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Choisis ton plan
          </h2>
          <p className="mt-4 text-zinc-600">
            Garantie 48 h si le GPS ne fonctionne pas après installation.
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

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={`/signup?plan=${plan.id}&next=${encodeURIComponent(getOnboardingUrl(plan.id))}`}
                className="mt-8 block"
              >
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

        <RefundGuaranteeNotice className="mt-8 text-center text-sm text-zinc-600" />
      </div>
    </section>
  );
}
