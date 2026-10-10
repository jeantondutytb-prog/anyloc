import { redirect } from "next/navigation";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { hasActiveRecoveryOffer } from "@/lib/checkout-recovery-server";
import { DEFAULT_PLAN_ID, getCheckoutUrl, isValidPlanId } from "@/lib/constants";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getStripePublishableKey } from "@/lib/stripe-client";
import { getSubscriptionAccessForUser } from "@/lib/subscription";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string;
    canceled?: string;
    preview?: string;
    paiement?: string;
  }>;
}) {
  const { plan, canceled, preview, paiement } = await searchParams;
  // Email links (?paiement=1) open straight on the payment form.
  const focusPayment = paiement === "1";
  // Local design preview without an account: /checkout?preview=1 under `next dev` only.
  const devPreview = process.env.NODE_ENV === "development" && preview === "1";
  const planId = plan ?? DEFAULT_PLAN_ID;

  if (!isValidPlanId(planId)) {
    redirect(getCheckoutUrl(DEFAULT_PLAN_ID));
  }

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
    <CheckoutView
      initialPlanId={planId}
      canceled={canceled === "true"}
      recoveryOffer={recoveryOffer}
      focusPayment={focusPayment}
      stripePublishableKey={getStripePublishableKey()}
    />
  );
}
