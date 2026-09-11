import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ONBOARDING_ENTRY_URL } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  getSubscriptionAccessForUser,
} from "@/lib/subscription";

export default async function DashboardLayout({
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
    redirect(ONBOARDING_ENTRY_URL);
  }

  return children;
}
