import { NextResponse } from "next/server";
import { getAccountBillingDetails } from "@/lib/account-billing";
import { getSubscriptionAccessForUser, requireAuthenticatedUser } from "@/lib/subscription";

export async function GET() {
  const { user, error } = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const access = await getSubscriptionAccessForUser(user.id, user.email);
  const details = await getAccountBillingDetails({
    userId: user.id,
    email: user.email ?? "",
    isAdmin: access.isAdmin,
  });

  return NextResponse.json(details);
}
