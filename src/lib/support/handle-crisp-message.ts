import { logError } from "@/lib/log-error";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { decideSupportReply, formatTranscript, type SupportDecision } from "@/lib/support/agent";
import {
  SUPPORT_AGENT_NICKNAME,
  getConversationMessages,
  getConversationMeta,
  markConversationUnresolved,
  sendOperatorText,
  sendPrivateNote,
  setComposing,
  setConversationSegments,
  type CrispMessage,
} from "@/lib/support/crisp-api";
import { describeCustomer } from "@/lib/support/customer-context";

export type SupportAgentMode = "off" | "draft" | "live";

/** Segment set on a conversation the agent handed over: it stays quiet there. */
export const ESCALATED_SEGMENT = "ia-escalade";

/** Visitors often send a question in several messages: answer the last one. */
const DEBOUNCE_MS = 8_000;

/** A human who wrote in the last hours owns the conversation. */
const HUMAN_TAKEOVER_MS = 12 * 60 * 60 * 1000;

/** After handing over, the agent leaves the conversation to the team this long. */
const ESCALATION_HOLD_MS = 24 * 60 * 60 * 1000;

const UNIQUE_VIOLATION = "23505";

const DEFAULT_HANDOVER_REPLY =
  "Je passe ta demande à un membre de l'équipe, il reprend la conversation ici et te répond au plus vite.";

export function getSupportAgentMode(): SupportAgentMode {
  const mode = process.env.CRISP_AGENT_MODE;
  return mode === "draft" || mode === "live" ? mode : "off";
}

function isHumanText(message: CrispMessage) {
  return (
    message.from === "operator" &&
    message.type !== "note" &&
    message.user?.nickname !== SUPPORT_AGENT_NICKNAME
  );
}

/**
 * Why the agent must stay out of this conversation, or null when it can act.
 * Exported for tests.
 */
export function getSkipReason({
  messages,
  fingerprint,
  segments,
  escalated = false,
  mode,
  now = Date.now(),
}: {
  messages: CrispMessage[];
  fingerprint: number;
  segments: string[];
  /** The agent handed this conversation over recently (from our own log). */
  escalated?: boolean;
  mode: Exclude<SupportAgentMode, "off">;
  now?: number;
}): "superseded" | "human_active" | null {
  const lastVisitorMessage = [...messages].reverse().find((message) => message.from === "user");
  if (lastVisitorMessage && lastVisitorMessage.fingerprint !== fingerprint) {
    return "superseded";
  }

  // In draft mode the team sends every answer by hand: that's not a takeover.
  if (mode === "draft") {
    return null;
  }

  // Crisp timestamps are in milliseconds.
  if (messages.some((message) => isHumanText(message) && now - message.timestamp < HUMAN_TAKEOVER_MS)) {
    return "human_active";
  }

  return escalated || segments.includes(ESCALATED_SEGMENT) ? "human_active" : null;
}

/**
 * Crisp segments and notes need a paid plan, so the handover is also
 * remembered in our own log.
 */
async function wasEscalatedRecently(sessionId: string) {
  if (!isSupabaseAdminConfigured()) {
    return false;
  }
  const { data, error } = await createAdminClient()
    .from("support_agent_events")
    .select("id")
    .eq("session_id", sessionId)
    .eq("action", "escalate")
    .gte("created_at", new Date(Date.now() - ESCALATION_HOLD_MS).toISOString())
    .limit(1);

  if (error) {
    await logError("support-agent/escalation-check", error, { session_id: sessionId });
    return false;
  }
  return (data ?? []).length > 0;
}

async function claimMessage(sessionId: string, fingerprint: number, mode: SupportAgentMode) {
  if (!isSupabaseAdminConfigured()) {
    return true;
  }
  const { error } = await createAdminClient()
    .from("support_agent_events")
    .insert({ session_id: sessionId, fingerprint, mode });

  if (!error) {
    return true;
  }
  if (error.code === UNIQUE_VIOLATION) {
    return false;
  }
  // Can't reach the table: answering twice beats not answering.
  await logError("support-agent/claim", error, { session_id: sessionId });
  return true;
}

async function recordOutcome(
  sessionId: string,
  fingerprint: number,
  outcome: {
    status: "superseded" | "human_active" | "done" | "error";
    decision?: SupportDecision;
    error?: string;
  }
) {
  if (!isSupabaseAdminConfigured()) {
    return;
  }
  const { decision } = outcome;
  const { error } = await createAdminClient()
    .from("support_agent_events")
    .update({
      status: outcome.status,
      action: decision?.action ?? null,
      reply: decision && decision.action !== "ignore" ? decision.reply : null,
      reason: decision?.action === "escalate" ? decision.reason : null,
      internal_note: decision?.internalNote ?? null,
      error: outcome.error ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("fingerprint", fingerprint);

  if (error) {
    await logError("support-agent/record", error, { session_id: sessionId });
  }
}

function formatDraftNote(decision: SupportDecision) {
  if (decision.action === "ignore") {
    return `[IA · brouillon] Rien à répondre.\n${decision.internalNote}`;
  }
  if (decision.action === "escalate") {
    return [
      `[IA · brouillon] À TOI : ${decision.reason}`,
      decision.internalNote,
      decision.reply ? `Message qui aurait été envoyé :\n${decision.reply}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  return `[IA · brouillon] Réponse proposée :\n${decision.reply}\n\n— ${decision.internalNote}`;
}

async function applyLiveDecision(sessionId: string, decision: SupportDecision, segments: string[]) {
  if (decision.action === "ignore") {
    return;
  }
  if (decision.action === "reply") {
    await sendOperatorText(sessionId, decision.reply);
    return;
  }
  await sendOperatorText(sessionId, decision.reply || DEFAULT_HANDOVER_REPLY);

  // Extras for the team: notes and segments need a paid Crisp plan, so a
  // refusal is fine. The reason stays in support_agent_events either way.
  const extras = await Promise.allSettled([
    sendPrivateNote(sessionId, `[IA] À TOI : ${decision.reason}\n\n${decision.internalNote}`),
    setConversationSegments(sessionId, [...new Set([...segments, ESCALATED_SEGMENT])]),
    markConversationUnresolved(sessionId),
  ]);
  for (const extra of extras) {
    if (extra.status === "rejected") {
      console.warn("support-agent: handover extra failed", String(extra.reason).slice(0, 200));
    }
  }
}

/**
 * Handles one visitor message: waits for the visitor to finish typing, checks
 * that no human has taken over, then lets the agent reply, hand over, or (in
 * draft mode) leave its answer as a private note.
 */
export async function handleCrispVisitorMessage({
  sessionId,
  fingerprint,
}: {
  sessionId: string;
  fingerprint: number;
}) {
  const mode = getSupportAgentMode();
  if (mode === "off" || !(await claimMessage(sessionId, fingerprint, mode))) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS));

  let composing = false;
  let decision: SupportDecision | undefined;
  try {
    const [messages, meta, escalated] = await Promise.all([
      getConversationMessages(sessionId),
      getConversationMeta(sessionId),
      wasEscalatedRecently(sessionId),
    ]);
    const segments = meta?.segments ?? [];

    const skipReason = getSkipReason({ messages, fingerprint, segments, escalated, mode });
    if (skipReason) {
      await recordOutcome(sessionId, fingerprint, { status: skipReason });
      return;
    }

    if (mode === "live") {
      composing = true;
      await setComposing(sessionId, true).catch(() => undefined);
    }

    // The Crisp email isn't verified: a live answer goes straight to whoever
    // typed it, so account data only reaches the model behind a human review.
    decision = await decideSupportReply({
      transcript: formatTranscript(messages),
      customer:
        mode === "draft"
          ? await describeCustomer(meta?.email)
          : "Email non vérifié : pas de données de compte. Pour une question sur le compte, renvoie vers l'espace connecté.",
    });

    if (mode === "draft") {
      await sendPrivateNote(sessionId, formatDraftNote(decision));
    } else {
      await applyLiveDecision(sessionId, decision, segments);
    }

    await recordOutcome(sessionId, fingerprint, { status: "done", decision });
  } catch (error) {
    await logError("support-agent/handle", error, { session_id: sessionId });
    await recordOutcome(sessionId, fingerprint, {
      status: "error",
      decision,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (composing) {
      await setComposing(sessionId, false).catch(() => undefined);
    }
  }
}
