import { redirect } from "next/navigation";
import { SuccessView } from "@/components/checkout/success-view";
import { getVerifiedCheckoutSession } from "@/lib/checkout-session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  if (!isSupabaseConfigured()) {
    redirect("/login?next=/checkout/success");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = sessionId
      ? `/checkout/success?session_id=${encodeURIComponent(sessionId)}`
      : "/checkout/success";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  let plan = null;
  let customerEmail: string | null = user.email ?? null;

  if (sessionId) {
    const verified = await getVerifiedCheckoutSession({
      sessionId,
      userId: user.id,
    });

    if (!verified) {
      redirect("/checkout?plan=annual");
    }

    plan = verified.plan;
    customerEmail = verified.customerEmail ?? customerEmail;
  }

  return <SuccessView plan={plan} customerEmail={customerEmail} />;
}
