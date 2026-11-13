/** Minimal Resend client: the REST API is one call, no SDK needed. */

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
