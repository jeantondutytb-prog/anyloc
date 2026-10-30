import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { PriceDisplayExperimentExposure } from "@/components/pricing/price-display-experiment-exposure";
import { PricingExperimentExposure } from "@/components/pricing/pricing-experiment-exposure";
import type { ReturningCustomer } from "@/lib/checkout-copy";
import {
  enrollInCheckoutRecovery,
  getActiveRecoveryOfferExpiry,
} from "@/lib/checkout-recovery-server";
import { DEFAULT_PLAN_ID, getCheckoutUrl, getPlanDisplayName, isValidPlanId } from "@/lib/constants";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSubscriptionInactiveReason } from "@/lib/subscription-inactive";
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
import {
  getEffectivePriceDisplayVariant,
  isPriceDisplayExperimentEnabled,
  parsePriceDisplayVariant,
  PRICE_DISPLAY_COOKIE,
} from "@/lib/price-display-experiment";

/** Server page: rendered once per request, so reading the clock is fine. */
function previewOfferEnd() {
  return new Date(Date.now() + 90_000).toISOString();
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string;
    canceled?: string;
    preview?: string;
    paiement?: string;
    pricing?: string;
    retour?: string;
    offre?: string;
    parcours?: string;
    prix?: string;
  }>;
}) {
  const { plan, canceled, preview, paiement, pricing, retour, parcours, prix, offre } =
    await searchParams;
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
  // Per day or per month: the dev preview can force it with &prix=per_month.
  const priceDisplay =
    (devPreview && parsePriceDisplayVariant(prix)) ||
    getEffectivePriceDisplayVariant((await cookies()).get(PRICE_DISPLAY_COOKIE)?.value);
  // Show the plan in the visitor's price grid; email links keep the plan
  // (and coupon) they announced.
  const planId = focusPayment
    ? requestedPlanId
    : planIdForVariant(requestedPlanId, pricingVariant);

  // End of the -50 % welcome offer, while it runs. The dev preview can show
  // it ending in 90 s: /checkout?preview=1&offre=1.
  let offerEndsAt: string | null =
    devPreview && offre === "1" ? previewOfferEnd() : null;
  // The dev preview can show the welcome-back copy: /checkout?preview=1&retour=1.
  let returning: ReturningCustomer | null =
    devPreview && retour === "1" ? { paymentFailed: false, previousPlanName: "6 mois" } : null;

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

    // The first paywall view starts the welcome offer (and its emails).
    await enrollInCheckoutRecovery(user, planId);
    offerEndsAt =
      (await getActiveRecoveryOfferExpiry(user.id).catch(() => null))?.toISOString() ?? null;

    // A former subscriber gets welcome-back copy; a first purchase stays as is.
    if (isSupabaseAdminConfigured()) {
      const { data: profile } = await createAdminClient()
        .from("profiles")
        .select("subscription_status, trial_status, trial_ends_at, plan_id")
        .eq("id", user.id)
        .maybeSingle();
      const reason = getSubscriptionInactiveReason(profile ?? {});
      if (reason !== "no_subscription") {
        returning = {
          paymentFailed: reason === "payment_failed",
          previousPlanName: getPlanDisplayName(profile?.plan_id ?? null),
        };
      }
    }
  }

  return (
    <>
      {isPricingExperimentEnabled() ? (
        <PricingExperimentExposure variant={pricingVariant} />
      ) : null}
      {isPriceDisplayExperimentEnabled() ? (
        <PriceDisplayExperimentExposure variant={priceDisplay} />
      ) : null}
      <CheckoutView
        initialPlanId={planId}
        canceled={canceled === "true"}
        offerEndsAt={offerEndsAt}
        focusPayment={focusPayment}
        stripePublishableKey={getStripePublishableKey()}
        returning={returning}
        fromQuiz={parcours === "quiz" && !returning}
        priceDisplay={priceDisplay}
      />
    </>
  );
}
