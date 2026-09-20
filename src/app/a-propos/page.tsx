import Link from "next/link";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { StaticPage, StaticSection } from "@/components/layout/static-page";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: `À propos — ${SITE.name}`,
  description:
    "Découvre la mission d'Anyloc : un outil simple pour contrôler ta localisation GPS sur Snap, Insta et Tinder Web.",
  path: "/a-propos",
});

export default function AProposPage() {
  return (
    <MarketingShell>
      <StaticPage
        title="À propos"
        description={SITE.tagline}
      >
        <StaticSection title="Notre mission">
          <p>
            {SITE.name} est né d&apos;un constat simple : modifier sa localisation
            sur Snapchat, Instagram ou Tinder ne devrait pas demander un
            ordinateur ni une app obscure. Nous avons créé un outil qui se
            pilote depuis le navigateur — iPhone comme Android, en quelques
            minutes.
          </p>
        </StaticSection>

        <StaticSection title="Ce qu'on propose">
          <p>
            Un service numérique accessible depuis ton espace client : un guide
            en 4 étapes, une carte pour choisir ta ville, et des plans flexibles
            sans engagement long terme.
          </p>
        </StaticSection>

        <StaticSection title="Nos valeurs">
          <p>
            Simplicité, transparence et support réactif. Pas de promesses
            impossibles — juste un outil qui fait ce qu&apos;il dit, avec une
            équipe disponible quand tu en as besoin.
          </p>
        </StaticSection>

        <div className="flex flex-wrap gap-3">
          <Link href="/pricing">
            <Button>Voir les tarifs</Button>
          </Link>
          <Link href="/contact">
            <Button variant="secondary">Nous contacter</Button>
          </Link>
        </div>
      </StaticPage>
    </MarketingShell>
  );
}
