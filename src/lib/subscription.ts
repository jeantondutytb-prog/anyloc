import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { isActiveTrial, isStripeTrialingStatus } from "@/lib/trial";

const ACTIVE_STATUSES = new Set(["active"]);

export type SubscriptionAccess = {
  hasAccess: boolean;
  status: string | null;
  planId: string | null;
  isAdmin: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
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
      isTrial: false,
      trialEndsAt: null,
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      hasAccess: false,
      status: null,
      planId: null,
      isAdmin: false,
      isTrial: false,
      trialEndsAt: null,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(
      "subscription_status, plan_id, email, is_admin, trial_status, trial_ends_at, trial_started_at, trial_payment_method_id"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      hasAccess: false,
      status: null,
      planId: null,
      isAdmin: false,
      isTrial: false,
      trialEndsAt: null,
    };
  }

  if (data.is_admin || isAdminEmail(data.email)) {
    return {
      hasAccess: true,
      status: "admin",
      planId: "admin",
      isAdmin: true,
      isTrial: false,
      trialEndsAt: null,
    };
  }

  const customTrialActive = isActiveTrial(data);
  const stripeTrialActive = isStripeTrialingStatus(data.subscription_status);
  const trialActive = customTrialActive || stripeTrialActive;
  const hasPaidAccess = isActiveSubscriptionStatus(data.subscription_status);

  return {
    hasAccess: hasPaidAccess || trialActive,
    status: trialActive ? "trialing" : data.subscription_status,
    planId: data.plan_id,
    isAdmin: false,
    isTrial: trialActive,
    trialEndsAt: trialActive ? data.trial_ends_at : null,
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
