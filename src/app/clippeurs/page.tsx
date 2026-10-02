import { Banknote, Gift, Rocket } from "lucide-react";
import { ClipperApplicationForm } from "@/components/clippeurs/clipper-application-form";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { Card } from "@/components/ui/card";
import { SITE } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: `Deviens clippeur — ${SITE.name}`,
  description:
    "Poste des vidéos courtes sur Anyloc, profite de l'accès gratuit et gagne de l'argent avec tes clips.",
  path: "/clippeurs",
  index: false,
});

const PERKS = [
  { icon: Gift, label: "Anyloc gratuit" },
  { icon: Banknote, label: "Payé pour tes clips" },
  { icon: Rocket, label: "Pas besoin d'abonnés" },
];

export default function ClippeursPage() {
  return (
    <MarketingShell>
      <section className="py-10 sm:py-20">
        <div className="mx-auto max-w-lg px-4 sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Poste des clips sur Anyloc. Gagne de l&apos;argent.
          </h1>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-600">
            {PERKS.map((perk) => (
              <li key={perk.label} className="flex items-center gap-1.5">
                <perk.icon className="h-4 w-4 text-pink-600" />
                {perk.label}
              </li>
            ))}
          </ul>

          <Card className="mt-6 p-5 sm:p-7">
            <ClipperApplicationForm />
          </Card>

          <p className="mt-4 text-center text-xs text-zinc-500">
            3 questions · 20 secondes
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
