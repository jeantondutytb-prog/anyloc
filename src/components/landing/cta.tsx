import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CHECKOUT_CTA_LABEL,
  CHECKOUT_MARKETING_LINE,
  DEFAULT_PLAN_ID,
  getOnboardingUrl,
} from "@/lib/constants";
import { OnboardingLink } from "@/components/onboarding/onboarding-link";

export function Cta() {
  return (
    <section data-track-section="final_cta" className="py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Prêt à changer de life ?
        </h2>
        <p className="mt-4 text-zinc-600">
          {CHECKOUT_MARKETING_LINE}
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <OnboardingLink href={getOnboardingUrl(DEFAULT_PLAN_ID)} data-track="cta_clicked" data-track-location="final_cta" data-track-plan={DEFAULT_PLAN_ID}>
            <Button size="lg">
              {CHECKOUT_CTA_LABEL}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </OnboardingLink>
        </div>
      </div>
    </section>
  );
}
