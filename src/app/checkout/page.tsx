import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { PricingExperimentExposure } from "@/components/pricing/pricing-experiment-exposure";
import { hasActiveRecoveryOffer } from "@/lib/checkout-recovery-server";
import { DEFAULT_PLAN_ID, getCheckoutUrl, isValidPlanId } from "@/lib/constants";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getStripePublishableKey } from "@/lib/stripe-client";
import { getSubscriptionAccessForUser } from "@/lib/subscription";
import {
  getEffectivePricingVariant,
  isPricingExperimentEnabled,
  parsePricingVariant,
  planIdForVariant,
  PRICING_VARIANT_COOKIE,
} from "@/lib/pricing-experiment";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string;
    canceled?: string;
    preview?: string;
    paiement?: string;
    pricing?: string;
  }>;
}) {
  const { plan, canceled, preview, paiement, pricing } = await searchParams;
  // Email links (?paiement=1) open straight on the payment form.
  const focusPayment = paiement === "1";
  // Local design preview without an account: /checkout?preview=1 under `next dev` only.
  const devPreview = process.env.NODE_ENV === "development" && preview === "1";
  const requestedPlanId = plan ?? DEFAULT_PLAN_ID;

  if (!isValidPlanId(requestedPlanId)) {
    redirect(getCheckoutUrl(DEFAULT_PLAN_ID));
  }

  // The dev preview can force a grid: /checkout?preview=1&pricing=grid_v2.
  const pricingVariant =
    devPreview && parsePricingVariant(pricing)
      ? parsePricingVariant(pricing)!
      : getEffectivePricingVariant((await cookies()).get(PRICING_VARIANT_COOKIE)?.value);
  // Show the plan in the visitor's price grid; email links keep the plan
  // (and coupon) they announced.
  const planId = focusPayment
    ? requestedPlanId
    : planIdForVariant(requestedPlanId, pricingVariant);

  let recoveryOffer = false;

  if (isSupabaseConfigured() && !devPreview) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Email recipients already have an account: log them in, then come back here.
      const next = focusPayment
        ? `${getCheckoutUrl(planId)}&paiement=1`
        : getCheckoutUrl(planId);
      redirect(
        `/${focusPayment ? "login" : "signup"}?plan=${planId}&next=${encodeURIComponent(next)}`
      );
    }

    const access = await getSubscriptionAccessForUser(user.id, user.email);

    if (access.hasAccess) {
      redirect("/dashboard");
    }

    recoveryOffer = await hasActiveRecoveryOffer(user.id).catch(() => false);
  }

  return (
    <>
      {isPricingExperimentEnabled() ? (
        <PricingExperimentExposure variant={pricingVariant} />
      ) : null}
      <CheckoutView
        initialPlanId={planId}
        canceled={canceled === "true"}
        recoveryOffer={recoveryOffer}
        focusPayment={focusPayment}
        stripePublishableKey={getStripePublishableKey()}
      />
    </>
  );
}
