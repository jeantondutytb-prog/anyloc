import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WebSpoofView } from "@/components/web-spoof/web-spoof-view";
import { createPageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";

export const metadata = createPageMetadata({
  title: `Web Spoofing — ${SITE.name}`,
  description:
    "Active le spoofing GPS dans ton navigateur pour Snapchat Web, Insta Web et les apps web qui lisent ta géolocalisation.",
  path: "/web",
});

export default function WebSpoofPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <WebSpoofView />
      <Footer />
    </div>
  );
}
