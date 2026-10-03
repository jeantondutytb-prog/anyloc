import { redirect } from "next/navigation";
import { DEFAULT_PLAN_ID, getCheckoutUrl, isValidPlanId } from "@/lib/constants";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const planId = isValidPlanId(plan) ? plan! : DEFAULT_PLAN_ID;
  redirect(
    `/signup?plan=${planId}&next=${encodeURIComponent(getCheckoutUrl(planId))}`
  );
}
