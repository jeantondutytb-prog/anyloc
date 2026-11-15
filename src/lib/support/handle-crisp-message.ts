import { logError } from "@/lib/log-error";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  decideSupportReply,
  formatTranscript,
  shortenSupportReply,
  type SupportDecision,
} from "@/lib/support/agent";
import {
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
import { enforceHandover, GUARD_HANDOVER_REPLY, type HandoverGuardRule } from "@/lib/support/handover-guard";
import { describeMessage, isHumanText, toAgentTexts } from "@/lib/support/message-kind";
import { enforceReplyLength, sendWelcomeOnce, WELCOME_MESSAGE } from "@/lib/support/reply-shape";
import { alertHandover, alertSupportError } from "@/lib/support/support-alerts";

export type SupportAgentMode = "off" | "draft" | "live";

/** Segment set on a conversation the agent handed over: it stays quiet there. */
export const ESCALATED_SEGMENT = "ia-escalade";

/**
 * Visitors often send a question in several messages: answer the last one.
 * Was 8 s, most of Léa's 11 s answer time; the instant welcome now covers
 * the wait, so 4 s is enough to catch a follow-up message.
 */
const DEBOUNCE_MS = 4_000;

/** Row that marks "welcome sent" for a conversation (unique per session). */
const WELCOME_FINGERPRINT = -1;

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

/** The visitor's last message as plain text, for the handover email. */
export function getLastVisitorText(messages: CrispMessage[]) {
  const last = [...messages].reverse().find((message) => message.from === "user");
  if (!last) return "";
  return typeof last.content === "string" ? last.content : `[message de type ${last.type}]`;
}

/**
 * The recent message by a person from the team that makes Léa step back, if
 * any. Crisp's automated messages and Léa's own never count.
 */
export function findHumanTakeover(
  messages: CrispMessage[],
  agentTexts?: Set<string>,
  now = Date.now()
) {
  // Crisp timestamps are in milliseconds.
  return messages.find(
    (message) => isHumanText(message, agentTexts) && now - message.timestamp < HUMAN_TAKEOVER_MS
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
  agentTexts,
  mode,
  now = Date.now(),
}: {
  messages: CrispMessage[];
  fingerprint: number;
  segments: string[];
  /** The agent handed this conversation over recently (from our own log). */
  escalated?: boolean;
  /** What Léa already sent here (from our own log), to recognise her messages. */
  agentTexts?: Set<string>;
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

  if (findHumanTakeover(messages, agentTexts, now)) {
    return "human_active";
  }

  return escalated || segments.includes(ESCALATED_SEGMENT) ? "human_active" : null;
}

/** Why Léa stepped back, kept in our log (no message content). */
function describeSkip(
  reason: "superseded" | "human_active",
  messages: CrispMessage[],
  agentTexts: Set<string>
) {
  if (reason !== "human_active") return undefined;
  const human = findHumanTakeover(messages, agentTexts);
  return human ? `Humain détecté : ${describeMessage(human)}` : "Conversation passée à l'équipe";
}

/**
 * What Léa did in this conversation, from our own log: whether she handed it
 * over recently (Crisp segments and notes need a paid plan), and the texts
 * she sent, to recognise her messages in Crisp.
 */
async function getAgentHistory(sessionId: string) {
  const fixedTexts = [WELCOME_MESSAGE, DEFAULT_HANDOVER_REPLY, GUARD_HANDOVER_REPLY];
  if (!isSupabaseAdminConfigured()) {
    return { escalated: false, agentTexts: toAgentTexts(fixedTexts) };
  }
  const { data, error } = await createAdminClient()
    .from("support_agent_events")
    .select("action, reply, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    await logError("support-agent/history", error, { session_id: sessionId });
    return { escalated: false, agentTexts: toAgentTexts(fixedTexts) };
  }
  const rows = (data ?? []) as { action: string | null; reply: string | null; created_at: string }[];
  const holdStart = Date.now() - ESCALATION_HOLD_MS;
  return {
    escalated: rows.some((row) => row.action === "escalate" && Date.parse(row.created_at) >= holdStart),
    agentTexts: toAgentTexts([...fixedTexts, ...rows.map((row) => row.reply)]),
  };
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
    note?: string;
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
      internal_note: [decision?.internalNote, outcome.note].filter(Boolean).join("\n\n") || null,
      error: outcome.error ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("fingerprint", fingerprint);

  if (error) {
    await logError("support-agent/record", error, { session_id: sessionId });
  }
}

/** True once per conversation: the unique (session_id, fingerprint) row decides. */
async function claimWelcome(sessionId: string) {
  if (!isSupabaseAdminConfigured()) {
    return true;
  }
  const { error } = await createAdminClient().from("support_agent_events").insert({
    session_id: sessionId,
    fingerprint: WELCOME_FINGERPRINT,
    mode: "live",
    status: "done",
    reply: WELCOME_MESSAGE,
    internal_note: "Accueil automatique",
    finished_at: new Date().toISOString(),
  });
  if (!error) {
    return true;
  }
  if (error.code !== UNIQUE_VIOLATION) {
    await logError("support-agent/welcome-claim", error, { session_id: sessionId });
  }
  return false;
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

  const startedAt = Date.now();
  const timings: Record<string, number> = {};
  const mark = (step: string) => {
    timings[step] = Date.now() - startedAt;
  };

  let composing = false;
  let decision: SupportDecision | undefined;
  let guardRule: HandoverGuardRule | null = null;
  let lastVisitorMessage = "";
  try {
    if (mode === "live") {
      // First look, before the wait: stay out of a conversation a human owns,
      // otherwise greet a new visitor at once and show Léa typing.
      const [early, earlyMeta, earlyHistory] = await Promise.all([
        getConversationMessages(sessionId),
        getConversationMeta(sessionId),
        getAgentHistory(sessionId),
      ]);
      const earlySkip = getSkipReason({
        messages: early,
        fingerprint,
        segments: earlyMeta?.segments ?? [],
        escalated: earlyHistory.escalated,
        agentTexts: earlyHistory.agentTexts,
        mode,
      });
      if (earlySkip) {
        await recordOutcome(sessionId, fingerprint, {
          status: earlySkip,
          note: describeSkip(earlySkip, early, earlyHistory.agentTexts),
        });
        return;
      }
      await sendWelcomeOnce({ sessionId, messages: early, claim: claimWelcome, send: sendOperatorText });
      mark("welcome");
      composing = true;
      await setComposing(sessionId, true).catch(() => undefined);
    }

    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS));

    const [messages, meta, { escalated, agentTexts }] = await Promise.all([
      getConversationMessages(sessionId),
      getConversationMeta(sessionId),
      getAgentHistory(sessionId),
    ]);
    const segments = meta?.segments ?? [];
    lastVisitorMessage = getLastVisitorText(messages);

    const skipReason = getSkipReason({ messages, fingerprint, segments, escalated, agentTexts, mode });
    if (skipReason) {
      await recordOutcome(sessionId, fingerprint, {
        status: skipReason,
        note: describeSkip(skipReason, messages, agentTexts),
      });
      return;
    }

    mark("context");
    if (mode === "live") {
      // Again after the wait: Crisp drops the indicator after a while.
      composing = true;
      await setComposing(sessionId, true).catch(() => undefined);
    }

    // The Crisp email isn't verified: a live answer goes straight to whoever
    // typed it, so account data only reaches the model behind a human review.
    const proposed = await decideSupportReply({
      transcript: formatTranscript(messages, agentTexts),
      customer:
        mode === "draft"
          ? await describeCustomer(meta?.email)
          : "Email non vérifié : pas de données de compte. Pour une question sur le compte, renvoie vers l'espace connecté.",
    });
    mark("model");
    // Too long: a short rewrite, then a clean cut. Before the handover guard,
    // so the guard sees the text that will really be sent.
    const short = await enforceReplyLength(proposed, shortenSupportReply);
    mark("shorten");
    // A refund promise, a discount, "zero ban" or a handover only announced
    // becomes a real handover, whatever the model decided.
    ({ decision, rule: guardRule } = enforceHandover(short));

    if (mode === "draft") {
      await sendPrivateNote(sessionId, formatDraftNote(decision));
    } else {
      await applyLiveDecision(sessionId, decision, segments);
    }

    mark("sent");
    // Also in our log: Vercel keeps runtime logs only a short while.
    await recordOutcome(sessionId, fingerprint, {
      status: "done",
      decision,
      note: `Temps (ms depuis la prise en charge) : ${JSON.stringify(timings)}`,
    });
    console.info("support-agent timing", JSON.stringify({ session_id: sessionId, ms: timings }));

    if (decision.action === "escalate") {
      await alertHandover({
        sessionId,
        reason: decision.reason,
        reply: decision.reply || DEFAULT_HANDOVER_REPLY,
        lastVisitorMessage,
        guardRule,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logError("support-agent/handle", error, { session_id: sessionId });
    await recordOutcome(sessionId, fingerprint, { status: "error", decision, error: message });
    await alertSupportError({ sessionId, error: message });
  } finally {
    if (composing) {
      await setComposing(sessionId, false).catch(() => undefined);
    }
  }
}
