import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/subscription";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (isSupabaseConfigured()) {
    const user = await getAuthenticatedUser();

    if (!user) {
      redirect("/login?redirectTo=/dashboard");
    }
  }

  return children;
}
