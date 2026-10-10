import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDailyViewsCsv } from "@/lib/tiktok-views-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasValidToken(request: Request) {
  const expected = process.env.STATS_CSV_TOKEN;
  const given = new URL(request.url).searchParams.get("token");
  if (!expected || !given) return false;

  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Daily TikTok views as CSV (date,vues), read by the KPI Google Sheet through
 * IMPORTDATA. Sheets can't send headers, so the secret travels as ?token=.
 */
export async function GET(request: Request) {
  if (!hasValidToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return new NextResponse(await getDailyViewsCsv(), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[stats/tiktok-views]", error);
    return NextResponse.json({ error: "Could not read TikTok views." }, { status: 500 });
  }
}
