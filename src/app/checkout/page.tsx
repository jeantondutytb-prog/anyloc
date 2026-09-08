import { redirect } from "next/navigation";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { getCheckoutUrl, isValidPlanId } from "@/lib/constants";
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
    const { data } = await supabase.auth.getClaims();

    if (!data?.claims) {
      redirect(`/login?next=${encodeURIComponent(getCheckoutUrl(planId))}`);
    }
  }

  return (
    <CheckoutView
      initialPlanId={planId}
      canceled={canceled === "true"}
    />
  );
}
