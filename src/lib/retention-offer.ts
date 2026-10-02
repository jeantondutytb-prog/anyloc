import type Stripe from "stripe";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

/**
 * The offer shown to a subscriber about to cancel: -50 %. A monthly plan
 * gets it on its next 3 invoices; a 6-month or annual plan has no invoice in
 * that window, so it gets it once, on the next renewal.
 */
const COUPONS = {
  repeating: {
    id: "anyloc-retention-50-3m",
    name: "Anyloc -50 % pendant 3 mois",
    duration: "repeating",
    duration_in_months: 3,
  },
  once: {
    id: "anyloc-retention-50-once",
    name: "Anyloc -50 % sur le prochain renouvellement",
    duration: "once",
  },
} as const;

const OFFER_USED_KEY = "retention_offer_used";

export type RetentionOffer =
  | { eligible: false }
  | { eligible: true; kind: keyof typeof COUPONS; label: string };

function offerForPlan(planId: string | null): RetentionOffer & { eligible: true } {
  return planId === "monthly" || planId === "weekly"
    ? { eligible: true, kind: "repeating", label: "-50 % sur tes 3 prochains mois" }
    : { eligible: true, kind: "once", label: "-50 % sur ton prochain renouvellement" };
}

/** Pure eligibility rule, kept apart from Stripe so it can be tested. */
export function getRetentionOffer(
  subscription: Pick<Stripe.Subscription, "status" | "metadata" | "discounts" | "cancel_at_period_end">,
  planId: string | null
): RetentionOffer {
  if (
    subscription.status !== "active" ||
    subscription.cancel_at_period_end ||
    subscription.metadata?.[OFFER_USED_KEY] === "true" ||
    subscription.discounts.length > 0
  ) {
    return { eligible: false };
  }

  return offerForPlan(planId);
}

async function loadSubscription(userId: string) {
  if (!stripe || !isSupabaseAdminConfigured()) {
    return null;
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_subscription_id, plan_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.stripe_subscription_id) {
    return null;
  }

  const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
  return { subscription, planId: (profile.plan_id as string | null) ?? null };
}

export async function getRetentionOfferForUser(userId: string): Promise<RetentionOffer> {
  const loaded = await loadSubscription(userId);
  return loaded ? getRetentionOffer(loaded.subscription, loaded.planId) : { eligible: false };
}

async function ensureCoupon(kind: keyof typeof COUPONS) {
  const coupon = COUPONS[kind];

  try {
    return await stripe!.coupons.retrieve(coupon.id);
  } catch (error) {
    if ((error as { code?: string }).code !== "resource_missing") {
      throw error;
    }
  }

  return stripe!.coupons.create({ percent_off: 50, ...coupon });
}

/** Applies the offer; returns false when the subscription isn't eligible. */
export async function acceptRetentionOffer(userId: string) {
  const loaded = await loadSubscription(userId);

  if (!loaded) {
    return null;
  }

  const offer = getRetentionOffer(loaded.subscription, loaded.planId);

  if (!offer.eligible) {
    return null;
  }

  const coupon = await ensureCoupon(offer.kind);
  await stripe!.subscriptions.update(loaded.subscription.id, {
    discounts: [{ coupon: coupon.id }],
    metadata: {
      ...loaded.subscription.metadata,
      [OFFER_USED_KEY]: "true",
      retention_offer_at: new Date().toISOString(),
    },
  });

  return offer;
}
