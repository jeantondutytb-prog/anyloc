import { redirect } from "next/navigation";
import { SubscriptionExpiredView } from "@/components/subscription/subscription-expired-view";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { noIndexMetadata } from "@/lib/seo";
import {
  getAuthenticatedUser,
  getSubscriptionAccessForUser,
} from "@/lib/subscription";
import { getSubscriptionInactiveDetails } from "@/lib/subscription-inactive";

export const metadata = noIndexMetadata;

export default async function SubscriptionExpiredPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string }>;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login?next=/dashboard/expired");
  }

  const access = await getSubscriptionAccessForUser(user.id, user.email);

  if (access.hasAccess) {
    redirect("/dashboard");
  }

  if (!isSupabaseAdminConfigured()) {
    redirect("/checkout?plan=annual");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_status, trial_status, trial_ends_at, plan_id")
    .eq("id", user.id)
    .maybeSingle();

  const details = getSubscriptionInactiveDetails(profile ?? {});

  const { card } = await searchParams;

  // Nothing to fix here but a new purchase: straight to the paywall and its
  // offers. A renewal Stripe is still retrying (past_due) stays here, since
  // the fix is a new card on the same subscription, not a second one.
  if (!details.updatePaymentMethod && card !== "declined") {
    redirect(details.checkoutUrl);
  }

  return (
    <SubscriptionExpiredView details={details} cardDeclined={card === "declined"} />
  );
}
