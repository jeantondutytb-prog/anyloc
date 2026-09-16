import { notFound } from "next/navigation";
import { SubscriptionExpiredView } from "@/components/subscription/subscription-expired-view";
import {
  getSubscriptionInactiveDetails,
  type SubscriptionInactiveReason,
} from "@/lib/subscription-inactive";
import { TRIAL_DURATION_MS } from "@/lib/trial";

const PREVIEW_PROFILES: Record<
  SubscriptionInactiveReason,
  {
    subscription_status?: string | null;
    trial_status?: "active" | "converted" | "cancelled" | "charge_failed" | null;
    trial_ends_at?: string | null;
    plan_id?: string | null;
  }
> = {
  payment_failed: {
    subscription_status: "past_due",
    trial_status: "charge_failed",
    plan_id: "monthly",
  },
  trial_cancelled: {
    subscription_status: "canceled",
    trial_status: "cancelled",
    plan_id: "annual",
  },
  ended: {
    subscription_status: "canceled",
    trial_status: "converted",
    plan_id: "6months",
  },
  trial_ended: {
    subscription_status: null,
    trial_status: "active",
    trial_ends_at: new Date(Date.now() - TRIAL_DURATION_MS).toISOString(),
    plan_id: "monthly",
  },
  no_subscription: {},
};

export default async function SubscriptionExpiredPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const { reason = "payment_failed" } = await searchParams;
  const previewReason = reason in PREVIEW_PROFILES ? reason : "payment_failed";

  return (
    <SubscriptionExpiredView
      details={getSubscriptionInactiveDetails(
        PREVIEW_PROFILES[previewReason as SubscriptionInactiveReason]
      )}
    />
  );
}
