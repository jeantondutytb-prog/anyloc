import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WebSpoofView } from "@/components/web-spoof/web-spoof-view";
import { ONBOARDING_ENTRY_URL, SITE } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  getSubscriptionAccessForUser,
} from "@/lib/subscription";

export const metadata = createPageMetadata({
  title: `Web Spoofing — ${SITE.name}`,
  description:
    "Active le spoofing GPS dans ton navigateur pour Snapchat Web, Insta Web et les apps web qui lisent ta géolocalisation.",
  path: "/web",
});

export default async function WebSpoofPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=config");
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login?next=/web");
  }

  const access = await getSubscriptionAccessForUser(user.id, user.email);

  if (!access.hasAccess) {
    redirect(ONBOARDING_ENTRY_URL);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <WebSpoofView />
      <Footer />
    </div>
  );
}
