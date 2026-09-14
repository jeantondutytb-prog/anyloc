import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOnboardingUrl } from "@/lib/constants";
import { TRIAL_CTA_LABEL, TRIAL_CTA_SUBLINE } from "@/lib/trial";

export function Cta() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Prêt à changer de life ?
        </h2>
        <p className="mt-4 text-zinc-600">
          Teste Anyloc 1 h gratuitement sur le plan de ton choix — Snap, Insta,
          Tinder et toutes tes apps.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <Link href={getOnboardingUrl("annual")}>
            <Button size="lg">
              {TRIAL_CTA_LABEL}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
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
