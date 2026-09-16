import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/stripe";
import {
  getSubscriptionInactiveDetails,
  toSubscriptionInactivePayload,
  type SubscriptionInactivePayload,
} from "@/lib/subscription-inactive";
import {
  getSubscriptionAccessForUser,
  type SubscriptionAccess,
} from "@/lib/subscription";

type ProfileInactiveFields = {
  subscription_status?: string | null;
  trial_status?: "active" | "converted" | "cancelled" | "charge_failed" | null;
  trial_ends_at?: string | null;
  plan_id?: string | null;
};

export type SubscriptionAccessResponse = {
  hasAccess: boolean;
  status: string | null;
  planId: string | null;
  isTrial: boolean;
  inactive: SubscriptionInactivePayload | null;
};

async function loadProfileInactiveFields(
  userId: string
): Promise<ProfileInactiveFields | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("subscription_status, trial_status, trial_ends_at, plan_id")
    .eq("id", userId)
    .maybeSingle();

  return data;
}

export async function buildSubscriptionAccessResponse(
  userId: string,
  email?: string | null
): Promise<SubscriptionAccessResponse> {
  const access = await getSubscriptionAccessForUser(userId, email);

  if (access.hasAccess) {
    return {
      hasAccess: true,
      status: access.status,
      planId: access.planId,
      isTrial: access.isTrial,
      inactive: null,
    };
  }

  const profile = await loadProfileInactiveFields(userId);
  const inactive = toSubscriptionInactivePayload(
    getSubscriptionInactiveDetails(profile ?? {}),
    getAppUrl()
  );

  return {
    hasAccess: false,
    status: access.status,
    planId: access.planId,
    isTrial: false,
    inactive,
  };
}

export function buildInactivePayloadFromAccess(
  access: SubscriptionAccess,
  profile: ProfileInactiveFields | null
): SubscriptionInactivePayload {
  return toSubscriptionInactivePayload(
    getSubscriptionInactiveDetails(profile ?? {}),
    getAppUrl()
  );
}
