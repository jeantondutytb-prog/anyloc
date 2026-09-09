import { NextResponse } from "next/server";
import { createBillingPortalSession } from "@/lib/account-billing";
import { requireAuthenticatedUser } from "@/lib/subscription";

export async function POST(request: Request) {
  const { user, error } = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  let flow: "default" | "subscription" | "payment_method" = "default";

  try {
    const body = await request.json();
    if (
      body?.flow === "subscription" ||
      body?.flow === "payment_method" ||
      body?.flow === "default"
    ) {
      flow = body.flow;
    }
  } catch {
    // Empty body is fine.
  }

  try {
    const url = await createBillingPortalSession({
      userId: user.id,
      flow,
    });

    return NextResponse.json({ url });
  } catch (portalError) {
    const message =
      portalError instanceof Error
        ? portalError.message
        : "Impossible d'ouvrir le portail de facturation.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
