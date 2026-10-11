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

  return (
    <SubscriptionExpiredView details={details} cardDeclined={card === "declined"} />
  );
}
