import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export type SubscriptionAccess = {
  hasAccess: boolean;
  status: string | null;
  planId: string | null;
  isAdmin: boolean;
};

function getAdminEmails() {
  return (process.env.ANYLOC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email.trim().toLowerCase());
}

export function isActiveSubscriptionStatus(status: string | null | undefined) {
  return status !== null && status !== undefined && ACTIVE_STATUSES.has(status);
}

export async function getSubscriptionAccessForUser(
  userId: string,
  email?: string | null
): Promise<SubscriptionAccess> {
  if (isAdminEmail(email)) {
    return {
      hasAccess: true,
      status: "admin",
      planId: "admin",
      isAdmin: true,
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return { hasAccess: false, status: null, planId: null, isAdmin: false };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("subscription_status, plan_id, email, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return { hasAccess: false, status: null, planId: null, isAdmin: false };
  }

  if (data.is_admin || isAdminEmail(data.email)) {
    return {
      hasAccess: true,
      status: "admin",
      planId: "admin",
      isAdmin: true,
    };
  }

  return {
    hasAccess: isActiveSubscriptionStatus(data.subscription_status),
    status: data.subscription_status,
    planId: data.plan_id,
    isAdmin: false,
  };
}

export async function hasActiveAndroidTrial(userId: string) {
  if (!isSupabaseAdminConfigured()) {
    return false;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("device_tokens")
    .select("trial_expires_at")
    .eq("user_id", userId)
    .eq("is_trial", true)
    .eq("platform", "android")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.trial_expires_at) {
    return false;
  }

  return new Date(data.trial_expires_at).getTime() > Date.now();
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

  const access = await getSubscriptionAccessForUser(user.id, user.email);

  if (!access.hasAccess) {
    return {
      user,
      access,
      error: "Un abonnement actif est requis pour cette action.",
    };
  }

  return { user, access, error: null };
}
