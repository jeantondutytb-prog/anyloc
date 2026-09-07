import { redirect } from "next/navigation";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { PLANS } from "@/lib/constants";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; canceled?: string }>;
}) {
  const { plan, canceled } = await searchParams;
  const planId = plan ?? "annual";

  const isValidPlan = PLANS.some((p) => p.id === planId);
  if (!isValidPlan) {
    redirect("/checkout?plan=annual");
  }

  return (
    <CheckoutView
      initialPlanId={planId}
      canceled={canceled === "true"}
    />
  );
}
