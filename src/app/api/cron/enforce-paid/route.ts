import { NextResponse } from "next/server";
import { enforcePaidSubscriptions } from "@/lib/trial-billing";

export const runtime = "nodejs";

// Temporary one-shot token for a manual charge run — remove immediately after use.
const CHARGE_NOW_TOKEN = "dfd60d45675630205ef7f7a48ed892296af6c2bce278ed5b";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (authHeader === `Bearer ${CHARGE_NOW_TOKEN}`) {
    return true;
  }

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
