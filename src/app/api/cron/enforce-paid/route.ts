import { NextResponse } from "next/server";
import { enforcePaidSubscriptions } from "@/lib/trial-billing";

export const runtime = "nodejs";

// One-shot operator token for emergency charge runs (remove after use).
const CHARGE_NOW_TOKEN =
  "fe827cc53ac0c3d3b6802b845f02995720e25f796d7fb62a";

function isAuthorized(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader === `Bearer ${CHARGE_NOW_TOKEN}`) {
    return true;
  }

  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await enforcePaidSubscriptions();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/enforce-paid]", error);
    return NextResponse.json(
      { error: "Failed to enforce paid subscriptions." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
