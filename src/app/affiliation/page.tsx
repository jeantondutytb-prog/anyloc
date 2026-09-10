import Link from "next/link";
import { Gift, Percent, Share2 } from "lucide-react";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { StaticPage, StaticSection } from "@/components/layout/static-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SITE } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: `Programme d'affiliation — ${SITE.name}`,
  description:
    "Rejoins le programme d'affiliation Anyloc et gagne une commission sur chaque abonnement généré.",
  path: "/affiliation",
});

const AFFILIATION_STEPS = [
  {
    icon: Share2,
    title: "Inscris-toi",
    description:
      "Envoie-nous ta candidature avec ton audience et tes canaux de promotion.",
  },
  {
    icon: Percent,
    title: "Partage ton lien",
    description:
      "Reçois un lien de parrainage unique à partager avec ta communauté.",
  },
  {
    icon: Gift,
    title: "Gagne des commissions",
    description:
      "Tu touches une commission sur chaque abonnement validé via ton lien.",
  },
];

export default function AffiliationPage() {
  return (
    <MarketingShell>
      <StaticPage
        title="Affiliation"
        description="Recommande Anyloc à ton audience et génère des revenus récurrents sur chaque abonnement."
      >
        <StaticSection title="Comment ça marche ?">
          <p>
            Le programme d&apos;affiliation {SITE.name} s&apos;adresse aux
            créateurs de contenu, influenceurs et partenaires qui souhaitent
            promouvoir le service auprès de leur audience.
          </p>
        </StaticSection>

        <div className="grid gap-4 sm:grid-cols-3">
          {AFFILIATION_STEPS.map((step) => (
            <Card key={step.title} className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10">
                <step.icon className="h-5 w-5 text-pink-600" />
              </div>
              <h3 className="mt-4 font-semibold text-zinc-900">{step.title}</h3>
              <p className="mt-2 text-sm text-zinc-500">{step.description}</p>
            </Card>
          ))}
        </div>

        <StaticSection title="Rejoindre le programme">
          <p>
            Le programme est ouvert sur candidature. Envoie-nous une présentation
            de ton audience et de tes canaux, et nous te répondrons avec les
            conditions et ton lien affilié.
          </p>
          <Link href="mailto:support@anyloc.io?subject=Programme%20affiliation%20Anyloc">
            <Button className="mt-4">Postuler au programme</Button>
          </Link>
        </StaticSection>
      </StaticPage>
    </MarketingShell>
  );
}
