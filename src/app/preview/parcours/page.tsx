import { notFound } from "next/navigation";
import { OnboardingQuizView } from "@/components/onboarding/onboarding-quiz-view";
import { getVisitorLocation } from "@/lib/visitor-location";

export const metadata = {
  title: "Prototype parcours — Anyloc",
};

/**
 * The quiz onboarding without an account, under `next dev` only: it ends on
 * the checkout's dev preview (/checkout?preview=1) with the recommended plan.
 */
export default async function ParcoursPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const visitorLocation = await getVisitorLocation();
  return <OnboardingQuizView visitorLocation={visitorLocation} checkoutPreview />;
}
