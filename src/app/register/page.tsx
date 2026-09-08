import { redirect } from "next/navigation";
import { isValidPlanId } from "@/lib/constants";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const planId = isValidPlanId(plan) ? plan! : "annual";
  redirect(`/signup?plan=${planId}`);
}
