import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOnboardingUrl } from "@/lib/constants";
import { getTrialCtaLabel } from "@/lib/trial";

export function Cta() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Prêt à changer de life ?
        </h2>
        <p className="mt-4 text-zinc-600">
          {getTrialCtaLabel()} — toi t&apos;es chez toi, sur la map t&apos;es à
          Marbella.
        </p>
        <Link
          href={`/signup?plan=annual&next=${encodeURIComponent(getOnboardingUrl("annual"))}`}
          className="mt-8 inline-block"
        >
          <Button size="lg">
            {getTrialCtaLabel()}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
