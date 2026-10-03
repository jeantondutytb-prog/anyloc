import { redirect } from "next/navigation";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { ensureStripeCustomerForUser } from "@/lib/billing";
import { DEFAULT_PLAN_ID, getCheckoutUrl, isValidPlanId } from "@/lib/constants";
import { getStripePublishableKey } from "@/lib/stripe-client";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getSubscriptionAccessForUser } from "@/lib/subscription";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; canceled?: string; preview?: string }>;
}) {
  const { plan, canceled, preview } = await searchParams;
  // Local design preview without an account: /checkout?preview=1 under `next dev` only.
  const devPreview = process.env.NODE_ENV === "development" && preview === "1";
  const planId = plan ?? DEFAULT_PLAN_ID;

  if (!isValidPlanId(planId)) {
    redirect(getCheckoutUrl(DEFAULT_PLAN_ID));
  }

  if (isSupabaseConfigured() && !devPreview) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(
        `/signup?plan=${planId}&next=${encodeURIComponent(getCheckoutUrl(planId))}`
      );
    }

    const access = await getSubscriptionAccessForUser(user.id, user.email);

    if (access.hasAccess) {
      redirect("/dashboard");
    }

    if (user.email) {
      try {
        await ensureStripeCustomerForUser({
          userId: user.id,
          email: user.email,
        });
      } catch (error) {
        console.error("[checkout] Failed to create Stripe customer:", error);
      }
    }
  }

  return (
    <CheckoutView
      initialPlanId={planId}
      canceled={canceled === "true"}
      stripePublishableKey={getStripePublishableKey()}
    />
  );
}
