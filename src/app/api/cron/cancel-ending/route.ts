import { NextResponse } from "next/server";
import { sendCancelEndingEmails } from "@/lib/cancel-ending-email-server";
import { logError } from "@/lib/log-error";

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
    const result = await sendCancelEndingEmails();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    await logError("cron/cancel-ending", error);
    return NextResponse.json({ error: "Cancel ending emails failed." }, { status: 500 });
  }
}
