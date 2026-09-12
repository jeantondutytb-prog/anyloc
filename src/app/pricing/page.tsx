import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { SITE } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: `Tarifs ${SITE.name} — Essai 24 h gratuit`,
  description:
    "Essaie Anyloc 24 h gratuitement. Plans mensuel, 6 mois ou annuel — GPS spoofé sur Snap, Insta, Tinder et toutes tes apps, sans jailbreak.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
