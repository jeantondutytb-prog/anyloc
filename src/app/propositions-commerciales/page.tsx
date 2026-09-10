import Link from "next/link";
import { Building2, Check } from "lucide-react";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { StaticPage, StaticSection } from "@/components/layout/static-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PendingNotice } from "@/components/ui/pending-notice";
import { SITE } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: `Propositions commerciales — ${SITE.name}`,
  description:
    "Offres entreprise et volumes pour équipes, agences et partenaires. Grille tarifaire en cours de finalisation.",
  path: "/propositions-commerciales",
});

const ENTERPRISE_FEATURES = [
  "Licences groupées pour équipes",
  "Facturation centralisée",
  "Support prioritaire dédié",
  "Accompagnement à l'installation",
  "Tarifs dégressifs selon le volume",
];

export default function PropositionsCommercialesPage() {
  return (
    <MarketingShell>
      <StaticPage
        title="Propositions commerciales"
        description="Des solutions adaptées aux équipes, agences et partenaires qui ont besoin de plusieurs accès ou d'un accompagnement dédié."
      >
        <PendingNotice
          title="Grille tarifaire entreprise en cours de finalisation"
          description="Les offres volume et les conditions commerciales sont en cours de préparation. Envoie-nous ton besoin et nous te répondrons avec une proposition adaptée."
        />

        <StaticSection title="Pour qui ?">
          <p>
            Que tu gères une équipe, une agence ou un réseau de revendeurs,
            nous construisons une offre sur mesure en fonction de tes besoins et
            de ton volume.
          </p>
        </StaticSection>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
              <Building2 className="h-5 w-5 text-pink-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-zinc-900">Offre Entreprise</h3>
              <ul className="mt-4 space-y-2">
                {ENTERPRISE_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-zinc-600"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <StaticSection title="Demander un devis">
          <p>
            Décris ton besoin (nombre de licences, usage prévu, délai) et
            notre équipe te répond avec une proposition personnalisée dès que
            la grille sera disponible.
          </p>
          <Link href="mailto:support@anyloc.io?subject=Demande%20entreprise%20Anyloc">
            <Button className="mt-4">Demander une proposition</Button>
          </Link>
        </StaticSection>
      </StaticPage>
    </MarketingShell>
  );
}
