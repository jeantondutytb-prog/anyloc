import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RemoteView } from "@/components/remote/remote-view";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  getSubscriptionAccessForUser,
} from "@/lib/subscription";
import { noIndexMetadata } from "@/lib/seo";
import { DEFAULT_PLAN_ID } from "@/lib/constants";
import {
  getEffectivePricingVariant,
  planIdForVariant,
  PRICING_VARIANT_COOKIE,
} from "@/lib/pricing-experiment";
import { getStripePublishableKey } from "@/lib/stripe-client";
import { isEligibleForIosAdhoc } from "@/lib/ios-adhoc/config";

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
  themeColor: "#0a0a0c",
};

/** Plan preselected in the remote's plans sheet, in the visitor's price grid. */
async function getRemotePlanId() {
  const variant = getEffectivePricingVariant(
    (await cookies()).get(PRICING_VARIANT_COOKIE)?.value
  );
  return planIdForVariant(DEFAULT_PLAN_ID, variant);
}

export default async function RemoteAppPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; paye?: string; piste?: string }>;
}) {
  const { preview, paye, piste } = await searchParams;

  // Local preview without an account, as a new signup sees it (no
  // subscription): /app?preview=1 under `next dev` only.
  // /app?preview=1&paye=1 shows the setup popup shown after a payment
  // (&piste=desktop for a plan without the iPhone app).
  if (process.env.NODE_ENV === "development" && preview === "1") {
    return (
      <RemoteView
        hasAccess={false}
        justPaid={paye === "1"}
        installTrack={piste === "desktop" ? "desktop" : "iphone"}
        planId={await getRemotePlanId()}
        stripePublishableKey={getStripePublishableKey()}
      />
    );
  }

  if (!isSupabaseConfigured()) {
    redirect("/login?error=config");
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login?next=/app");
  }

  // Accounts without a subscription get in too: the onboarding sends new
  // signups here to pick a destination and teleport before the paywall.
  const access = await getSubscriptionAccessForUser(user.id, user.email);

  return (
    <RemoteView
      hasAccess={access.hasAccess}
      // Back from a payment made in the plans sheet: the setup comes next.
      justPaid={paye === "1" && access.hasAccess}
      installTrack={isEligibleForIosAdhoc(access) ? "iphone" : "desktop"}
      planId={await getRemotePlanId()}
      stripePublishableKey={getStripePublishableKey()}
    />
  );
}
