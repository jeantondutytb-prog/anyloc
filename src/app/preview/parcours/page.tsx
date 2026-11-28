import { notFound } from "next/navigation";
import { OnboardingQuizView } from "@/components/onboarding/onboarding-quiz-view";
import { getPaywallBlackFriday } from "@/lib/black-friday";
import { getVisitorLocation } from "@/lib/visitor-location";

export const metadata = {
  title: "Prototype parcours — Anyloc",
};

/**
 * The quiz onboarding without an account, under `next dev` only: it ends on
 * the checkout's dev preview (/checkout?preview=1) with the recommended plan.
 * ?bf=1 shows the Black Friday prices on the plan sheet without the Stripe coupon.
 */
export default async function ParcoursPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ bf?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const { bf } = await searchParams;
  const blackFriday = bf === "1" ? getPaywallBlackFriday({ now: new Date(), couponId: "preview" }) : null;
  const visitorLocation = await getVisitorLocation();
  return (
    <OnboardingQuizView visitorLocation={visitorLocation} checkoutPreview blackFriday={blackFriday} />
  );
}
