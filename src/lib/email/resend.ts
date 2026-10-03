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
