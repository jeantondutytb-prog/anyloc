import { NextResponse } from "next/server";
import {
  checkNoSaleAlert,
  forceRecoveryStep,
  processCheckoutRecoveries,
} from "@/lib/checkout-recovery-server";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Hourly: recovery emails + "no sale in 4 h" alert.
 * Test: ?force_email=<address>&force_step=1|2|3 sends that step now.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const forceEmail = url.searchParams.get("force_email");
  const forceStep = Number(url.searchParams.get("force_step"));

  try {
    if (forceEmail) {
      if (forceStep !== 1 && forceStep !== 2 && forceStep !== 3) {
        return NextResponse.json({ error: "force_step must be 1, 2 or 3" }, { status: 400 });
      }
      const sent = await forceRecoveryStep(forceEmail, forceStep);
      return NextResponse.json({ ok: true, sent });
    }

    const [recoveries, noSaleAlert] = await Promise.all([
      processCheckoutRecoveries(),
      checkNoSaleAlert(),
    ]);
    return NextResponse.json({ ok: true, recoveries, noSaleAlert });
  } catch (error) {
    console.error("[cron/checkout-recovery]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout recovery failed." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
