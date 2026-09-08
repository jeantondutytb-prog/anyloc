import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export type SubscriptionAccess = {
  hasAccess: boolean;
  status: string | null;
  planId: string | null;
};

export function isActiveSubscriptionStatus(status: string | null | undefined) {
  return status !== null && status !== undefined && ACTIVE_STATUSES.has(status);
}

export async function getSubscriptionAccessForUser(
  userId: string
): Promise<SubscriptionAccess> {
  if (!isSupabaseAdminConfigured()) {
    return { hasAccess: false, status: null, planId: null };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("subscription_status, plan_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return { hasAccess: false, status: null, planId: null };
  }

  return {
    hasAccess: isActiveSubscriptionStatus(data.subscription_status),
    status: data.subscription_status,
    planId: data.plan_id,
  };
}

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { user: null, error: "Connecte-toi pour accéder à cette ressource." };
  }

  return { user, error: null };
}

export async function requireActiveSubscription() {
  const { user, error } = await requireAuthenticatedUser();

  if (!user) {
    return { user: null, access: null, error };
  }

  const access = await getSubscriptionAccessForUser(user.id);

  if (!access.hasAccess) {
    return {
      user,
      access,
      error: "Un abonnement actif est requis pour cette action.",
    };
  }

  return { user, access, error: null };
}
