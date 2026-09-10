import Link from "next/link";
import { MessageCircle, Users } from "lucide-react";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { StaticPage, StaticSection } from "@/components/layout/static-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PendingBadge } from "@/components/ui/pending-info";
import { PendingNotice } from "@/components/ui/pending-notice";
import { SITE } from "@/lib/constants";
import { SOCIAL_LINKS } from "@/lib/footer-links";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: `Communauté ${SITE.name} — Entraide et astuces GPS`,
  description:
    "Rejoins la communauté Anyloc : entraide, astuces d'installation et retours d'expérience entre utilisateurs.",
  path: "/communaute",
});

const SOCIAL_ICONS = {
  Discord: MessageCircle,
  Instagram: Users,
} as const;

export default function CommunautePage() {
  return (
    <MarketingShell>
      <StaticPage
        title="Communauté"
        description="Échange avec d'autres utilisateurs, partage tes astuces et reste informé des nouveautés Anyloc."
      >
        <PendingNotice
          title="Espaces communautaires en préparation"
          description="Nos serveurs Discord et notre compte Instagram sont en cours de mise en place. Tu pourras bientôt nous rejoindre directement depuis cette page."
        />

        <StaticSection title="À venir">
          <p>
            La communauté {SITE.name} sera l&apos;endroit idéal pour poser tes
            questions, partager tes setups et découvrir comment les autres
            utilisent le service au quotidien.
          </p>
        </StaticSection>

        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_LINKS.map((social) => {
            const Icon = SOCIAL_ICONS[social.label as keyof typeof SOCIAL_ICONS];

            return (
              <Card key={social.label} className="p-6 opacity-90">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                    <Icon className="h-5 w-5 text-pink-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-zinc-900">
                        {social.label}
                      </h3>
                      <PendingBadge />
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      {social.description}
                    </p>
                    <p className="mt-3 text-sm italic text-zinc-400">
                      Lien bientôt disponible
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <StaticSection title="Besoin d'aide maintenant ?">
          <p>
            En attendant l&apos;ouverture de la communauté, notre équipe support
            reste disponible par email pour toute question liée à ton compte ou
            ton abonnement.
          </p>
          <Link href="/contact">
            <Button className="mt-4">Nous contacter</Button>
          </Link>
        </StaticSection>
      </StaticPage>
    </MarketingShell>
  );
}
