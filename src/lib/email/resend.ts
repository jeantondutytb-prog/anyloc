/** Minimal Resend client: the REST API is one call, no SDK needed. */

import { capturePostHogEvent } from "@/lib/posthog/server";

/** All sends are counted on this one id, without creating a person. */
export const EMAIL_USAGE_DISTINCT_ID = "system:resend";

/**
 * One `email_sent` per email Resend accepted: PostHog alerts at 80 % of the
 * daily and monthly Resend quota count these. Never throws, never blocks the send.
 */
async function trackEmailSent(params: SendEmailParams) {
  try {
    await capturePostHogEvent({
      distinctId: EMAIL_USAGE_DISTINCT_ID,
      event: "email_sent",
      properties: {
        campaign: params.tags?.find((tag) => tag.name === "campaign")?.value ?? null,
        scheduled: Boolean(params.scheduledAt),
        $process_person_profile: false,
      },
    });
  } catch {}
}

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
  /** Sends later (Resend queues it; cancel with cancelScheduledEmail). */
  scheduledAt?: Date;
};

export const DEFAULT_EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Jean d'Anyloc <jean@anyloc.io>";

/**
 * Sender of the recovery emails: its own subdomain (e.g. "Jean d'Anyloc
 * <jean@relance.anyloc.io>", verified in Resend first), so their reputation at
 * Gmail never drags down the account emails sent from anyloc.io. Unset: the
 * default sender.
 */
export const RECOVERY_EMAIL_FROM = process.env.RECOVERY_EMAIL_FROM || DEFAULT_EMAIL_FROM;

/** Replies to any email land in the inbox Jean reads, whatever the sender. */
export const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || "jean@anyloc.io";

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(params: SendEmailParams): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const from = params.from ?? DEFAULT_EMAIL_FROM;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      reply_to: params.replyTo ?? from,
      headers: params.headers,
      tags: params.tags,
      ...(params.scheduledAt ? { scheduled_at: params.scheduledAt.toISOString() } : {}),
    }),
  });

  const body = (await res.json().catch(() => null)) as
    | { id?: string; message?: string }
    | null;

  if (!res.ok || !body?.id) {
    throw new Error(`Resend ${res.status}: ${body?.message ?? "unknown error"}`);
  }

  await trackEmailSent(params);
  return { id: body.id };
}

/** Cancels an email scheduled with `scheduledAt`. False when it already went out (or is unknown). */
export async function cancelScheduledEmail(id: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return res.ok;
}
