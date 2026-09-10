import Link from "next/link";
import { MessageCircle, Users } from "lucide-react";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { StaticPage, StaticSection } from "@/components/layout/static-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SITE } from "@/lib/constants";
import { SOCIAL_LINKS } from "@/lib/footer-links";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: `Communauté ${SITE.name} — Entraide et astuces GPS`,
  description:
    "Rejoins la communauté Anyloc : entraide, astuces d'installation et retours d'expérience entre utilisateurs.",
  path: "/communaute",
});

export default function CommunautePage() {
  return (
    <MarketingShell>
      <StaticPage
        title="Communauté"
        description="Échange avec d'autres utilisateurs, partage tes astuces et reste informé des nouveautés Anyloc."
      >
        <StaticSection title="Rejoins-nous">
          <p>
            La communauté {SITE.name} est l&apos;endroit idéal pour poser tes
            questions, partager tes setups et découvrir comment les autres
            utilisent le service au quotidien.
          </p>
        </StaticSection>

        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_LINKS.map((social) => (
            <Card key={social.label} className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                  {social.label === "Discord" ? (
                    <MessageCircle className="h-5 w-5 text-pink-600" />
                  ) : (
                    <Users className="h-5 w-5 text-pink-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900">{social.label}</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {social.label === "Discord"
                      ? "Chat en direct, support communautaire et annonces."
                      : "Contenus, tutos et coulisses du produit."}
                  </p>
                  <Link
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm text-pink-600 hover:underline"
                  >
                    Rejoindre sur {social.label}
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <StaticSection title="Besoin d'aide personnalisée ?">
          <p>
            Pour une question liée à ton compte ou à ton abonnement, notre
            équipe support reste disponible par email.
          </p>
          <Link href="/contact">
            <Button className="mt-4">Nous contacter</Button>
          </Link>
        </StaticSection>
      </StaticPage>
    </MarketingShell>
  );
}
