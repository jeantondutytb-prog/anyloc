import Link from "next/link";
import { Mail } from "lucide-react";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { StaticPage } from "@/components/layout/static-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: `Nous contacter — ${SITE.name}`,
  description:
    "Contacte l'équipe Anyloc pour toute question sur ton compte, ton installation ou ton abonnement.",
  path: "/contact",
});

const CONTACT_EMAIL = "support@anyloc.io";

export default function ContactPage() {
  return (
    <MarketingShell>
      <StaticPage
        title="Nous contacter"
        description="Notre équipe est disponible pour t'aider. On répond généralement sous 48 heures ouvrées."
      >
        <Card className="p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10">
            <Mail className="h-5 w-5 text-pink-600" />
          </div>
          <h3 className="mt-4 font-semibold text-zinc-900">Support client</h3>
          <p className="mt-2 text-sm text-zinc-500">
            Questions sur ton compte, ton installation ou ton abonnement.
          </p>
          <Link href={`mailto:${CONTACT_EMAIL}`} className="mt-4 block">
            <Button variant="secondary" className="w-full sm:w-auto">
              {CONTACT_EMAIL}
            </Button>
          </Link>
        </Card>

        <p className="text-sm text-zinc-500">
          Avant de nous écrire, consulte la{" "}
          <Link href="/#faq" className="text-pink-600 hover:underline">
            FAQ
          </Link>{" "}
          — la réponse à ta question s&apos;y trouve peut-être déjà.
        </p>
      </StaticPage>
    </MarketingShell>
  );
}
