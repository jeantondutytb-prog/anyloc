import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { RemoteView } from "@/components/remote/remote-view";
import { SUBSCRIPTION_EXPIRED_PATH } from "@/lib/subscription-inactive";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  getSubscriptionAccessForUser,
} from "@/lib/subscription";
import { noIndexMetadata } from "@/lib/seo";

// iPhone remote: replaces the native iOS app. Customers add this page to
// their home screen (Safari → Partager → Sur l'écran d'accueil), which needs
// no signing, no provisioning profile and never expires.
export const metadata: Metadata = {
  ...noIndexMetadata,
  title: "Anyloc",
  appleWebApp: {
    capable: true,
    title: "Anyloc",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default async function RemoteAppPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=config");
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login?next=/app");
  }

  const access = await getSubscriptionAccessForUser(user.id, user.email);

  if (!access.hasAccess) {
    redirect(SUBSCRIPTION_EXPIRED_PATH);
  }

  return <RemoteView />;
}
