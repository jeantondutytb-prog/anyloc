import { NextResponse } from "next/server";
import { recordTikTokViews } from "@/lib/tiktok-views-server";

export const runtime = "nodejs";
// The Apify run reads ~300 videos and can take a few minutes.
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

/** Every evening: snapshot the TikTok accounts' videos and record the day's views. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recordTikTokViews();
    if (result.errors.length > 0) {
      console.warn("[cron/tiktok-views] accounts not read:", result.errors);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/tiktok-views]", error);
    return NextResponse.json({ error: "TikTok views run failed." }, { status: 500 });
  }
}
