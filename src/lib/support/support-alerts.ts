import { isResendConfigured, sendEmail } from "@/lib/email/resend";
import { logError } from "@/lib/log-error";
import { OPS_ALERT_EMAIL } from "@/lib/ops-alert";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { HANDOVER_GUARD_REASONS, type HandoverGuardRule } from "@/lib/support/handover-guard";

/**
 * Emails to Jean when Léa hands a conversation over or fails. Without them a
 * handover waited until someone opened Crisp, and a dead API key went
 * unnoticed for 12 days. Same channel as the "0 sale in 4 h" alert.
 */

/** One error email per hour at most: a broken key fails on every message. */
const ERROR_ALERT_KEY = "support_agent_error";
const ERROR_ALERT_THROTTLE_MS = 60 * 60 * 1000;

const MAX_QUOTE = 600;

export type SupportAlert = { subject: string; text: string; html: string };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function quote(value: string) {
  const text = value.trim();
  return text.length > MAX_QUOTE ? `${text.slice(0, MAX_QUOTE)}…` : text;
}

export function crispConversationUrl(sessionId: string, websiteId = process.env.CRISP_WEBSITE_ID) {
  return websiteId
    ? `https://app.crisp.chat/website/${websiteId}/inbox/${sessionId}/`
    : "https://app.crisp.chat/";
}

function toAlert(subject: string, blocks: Array<[label: string, value: string]>, url: string): SupportAlert {
  const filled = blocks.filter(([, value]) => value.trim());
  const text = [...filled.map(([label, value]) => `${label}\n${value}`), `Ouvrir dans Crisp : ${url}`].join("\n\n");
  const html = [
    ...filled.map(
      ([label, value]) =>
        `<p><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value).replace(/\n/g, "<br>")}</p>`
    ),
    `<p><a href="${escapeHtml(url)}">Ouvrir la conversation dans Crisp</a></p>`,
  ].join("");
  return { subject, text, html };
}

/** Exported for tests. */
export function buildHandoverAlert(input: {
  sessionId: string;
  reason: string;
  reply: string;
  lastVisitorMessage: string;
  guardRule: HandoverGuardRule | null;
  websiteId?: string;
}): SupportAlert {
  const subject = input.guardRule
    ? "Léa te passe la main (garde-fou)"
    : "Léa te passe la main";
  return toAlert(
    subject,
    [
      ["Pourquoi", input.guardRule ? HANDOVER_GUARD_REASONS[input.guardRule] : input.reason],
      ["Dernier message du client", quote(input.lastVisitorMessage)],
      ["Ce que Léa lui a écrit", quote(input.reply)],
      [
        "À faire",
        "Réponds dans Crisp. Léa ne reparle pas dans cette conversation pendant 24 h.",
      ],
    ],
    crispConversationUrl(input.sessionId, input.websiteId)
  );
}

/** Exported for tests. */
export function buildErrorAlert(input: { sessionId: string; error: string; websiteId?: string }): SupportAlert {
  return toAlert(
    "Léa est en erreur : des clients n'ont pas de réponse",
    [
      ["Erreur", quote(input.error)],
      [
        "À savoir",
        "Un seul mail par heure, même si d'autres messages échouent. Une erreur 401 « invalid x-api-key » veut dire que la clé ANTHROPIC_API_KEY sur Vercel ne marche plus. Le détail est dans la table support_agent_events (status = error).",
      ],
    ],
    crispConversationUrl(input.sessionId, input.websiteId)
  );
}

async function send(alert: SupportAlert, tag: string) {
  await sendEmail({
    to: OPS_ALERT_EMAIL,
    subject: alert.subject,
    text: alert.text,
    html: alert.html,
    tags: [{ name: "campaign", value: tag }],
  });
}

/** Never throws: an alert that fails must not stop the handover. */
export async function alertHandover(input: Parameters<typeof buildHandoverAlert>[0]) {
  if (!isResendConfigured()) return;
  try {
    await send(buildHandoverAlert(input), "support_handover");
  } catch (error) {
    await logError("support-agent/alert-handover", error, { session_id: input.sessionId });
  }
}

/** Never throws. At most one email per hour, remembered in ops_alerts. */
export async function alertSupportError(input: { sessionId: string; error: string }, now = new Date()) {
  if (!isResendConfigured() || !isSupabaseAdminConfigured()) return;
  try {
    const admin = createAdminClient();
    const { data: last } = await admin
      .from("ops_alerts")
      .select("last_sent_at")
      .eq("key", ERROR_ALERT_KEY)
      .maybeSingle<{ last_sent_at: string }>();
    if (last && now.getTime() - new Date(last.last_sent_at).getTime() < ERROR_ALERT_THROTTLE_MS) {
      return;
    }
    await admin.from("ops_alerts").upsert({ key: ERROR_ALERT_KEY, last_sent_at: now.toISOString() });
    await send(buildErrorAlert(input), "support_error");
  } catch (error) {
    await logError("support-agent/alert-error", error, { session_id: input.sessionId });
  }
}
