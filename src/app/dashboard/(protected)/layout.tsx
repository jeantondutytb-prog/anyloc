import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { TrialStatusBanner } from "@/components/dashboard/trial-status-banner";
import { SUBSCRIPTION_EXPIRED_PATH } from "@/lib/subscription-inactive";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  getSubscriptionAccessForUser,
} from "@/lib/subscription";

export default async function ProtectedDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=config");
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const access = await getSubscriptionAccessForUser(user.id, user.email);

  if (!access.hasAccess) {
    redirect(SUBSCRIPTION_EXPIRED_PATH);
  }

  return (
    <>
      {access.isTrial && access.trialEndsAt ? (
        <TrialStatusBanner trialEndsAt={access.trialEndsAt} />
      ) : null}
      {children}
    </>
  );
}
