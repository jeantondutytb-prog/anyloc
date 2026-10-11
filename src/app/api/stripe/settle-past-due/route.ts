import { NextResponse } from "next/server";
import { settlePastDueSubscriptionForUser } from "@/lib/account-billing";
import { logError } from "@/lib/log-error";
import { getAppUrl } from "@/lib/stripe";
import { getAuthenticatedUser } from "@/lib/subscription";
import { SUBSCRIPTION_EXPIRED_PATH } from "@/lib/subscription-inactive";

// The billing portal redirects here once a past_due customer saved a new card.
export async function GET() {
  const appUrl = getAppUrl();
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.redirect(
      `${appUrl}/login?next=${encodeURIComponent(SUBSCRIPTION_EXPIRED_PATH)}`
    );
  }

  try {
    const { settled } = await settlePastDueSubscriptionForUser(user.id);

    if (settled) {
      return NextResponse.redirect(`${appUrl}/dashboard`);
    }
  } catch (error) {
    await logError("stripe/settle-past-due", error, { userId: user.id });
  }

  return NextResponse.redirect(
    `${appUrl}${SUBSCRIPTION_EXPIRED_PATH}?card=declined`
  );
}
