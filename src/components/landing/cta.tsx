import Link from "next/link";
import { TrialCtaLink } from "@/components/navigation/trial-cta-link";
import { getOnboardingUrl } from "@/lib/constants";
import { TRIAL_CTA_LABEL, TRIAL_CTA_SUBLINE, TRIAL_MARKETING_LINE } from "@/lib/trial";

export function Cta() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Prêt à changer de life ?
        </h2>
        <p className="mt-4 text-zinc-600">
          {TRIAL_MARKETING_LINE}
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <TrialCtaLink href={getOnboardingUrl("annual")} label={TRIAL_CTA_LABEL} />
          <p className="text-sm text-zinc-500">{TRIAL_CTA_SUBLINE}</p>
          <p className="text-sm text-zinc-500">
            Déjà client ?{" "}
            <Link
              href="/login"
              className="font-medium text-pink-600 transition-colors hover:text-pink-700 hover:underline"
            >
              Connexion
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
