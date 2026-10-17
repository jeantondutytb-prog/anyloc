import { NextResponse } from "next/server";
import { isCheckoutSessionDeclined } from "@/lib/checkout-first-month-offer-server";
import { logError } from "@/lib/log-error";
import { limitByIp } from "@/lib/rate-limit";

/**
 * Polled by the payment popup: whether its checkout was refused for lack of
 * funds (stamped by the webhook), to offer the -50 % first month.
 */
export async function GET(request: Request) {
  const limited = limitByIp(request, "checkout-decline", 40, 60_000);
  if (limited) {
    return limited;
  }

  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim();

  if (!sessionId?.startsWith("cs_")) {
    return NextResponse.json({ error: "Session manquante." }, { status: 400 });
  }

  try {
    return NextResponse.json({ declined: await isCheckoutSessionDeclined(sessionId) });
  } catch (error) {
    await logError("stripe/checkout-decline", error, { stripe_object_id: sessionId });
    return NextResponse.json({ declined: false });
  }
}
