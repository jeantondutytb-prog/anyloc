import { after, NextResponse } from "next/server";
import { isCrispConfigured, verifyCrispHook } from "@/lib/support/crisp-api";
import { getSupportAgentMode, handleCrispVisitorMessage } from "@/lib/support/handle-crisp-message";

export const runtime = "nodejs";

// The debounce plus one model call run after the response, within this budget.
export const maxDuration = 120;

type CrispHookPayload = {
  event?: string;
  data?: {
    session_id?: string;
    from?: string;
    type?: string;
    fingerprint?: number;
  };
};

/**
 * Crisp "message:send" hook (a visitor wrote). Answers 200 at once, as Crisp
 * expects, and lets the support agent work in the background.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  const verified = verifyCrispHook({
    rawBody,
    timestamp: request.headers.get("x-crisp-request-timestamp"),
    signature: request.headers.get("x-crisp-signature"),
    urlKey: new URL(request.url).searchParams.get("key"),
  });

  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: CrispHookPayload;
  try {
    payload = JSON.parse(rawBody) as CrispHookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = payload.data;
  const sessionId = data?.session_id;
  const fingerprint = data?.fingerprint;

  if (
    payload.event === "message:send" &&
    data?.from === "user" &&
    data.type !== "note" &&
    typeof sessionId === "string" &&
    typeof fingerprint === "number" &&
    getSupportAgentMode() !== "off" &&
    isCrispConfigured()
  ) {
    after(() => handleCrispVisitorMessage({ sessionId, fingerprint }));
  }

  return NextResponse.json({ ok: true });
}
