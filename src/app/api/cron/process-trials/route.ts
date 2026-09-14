import { NextResponse } from "next/server";
import { processDueTrialCharges } from "@/lib/trial-billing";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueTrialCharges();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/process-trials]", error);
    return NextResponse.json({ error: "Trial processing failed." }, { status: 500 });
  }
}
