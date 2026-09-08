import { redirect } from "next/navigation";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { ensureStripeCustomerForUser } from "@/lib/billing";
import { getCheckoutUrl, isValidPlanId } from "@/lib/constants";
import { getStripePublishableKey } from "@/lib/stripe-client";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; canceled?: string }>;
}) {
  const { plan, canceled } = await searchParams;
  const planId = plan ?? "annual";

  if (!isValidPlanId(planId)) {
    redirect("/checkout?plan=annual");
  }

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/login?next=${encodeURIComponent(getCheckoutUrl(planId))}`);
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
