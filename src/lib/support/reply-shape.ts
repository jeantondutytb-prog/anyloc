import { SUPPORT_AGENT_NICKNAME, type CrispMessage } from "@/lib/support/crisp-api";

/**
 * What the visitor sees and how long it is: the instant welcome (sent before
 * the model is called, once per conversation) and the length cap on answers.
 */

/** Jean's wording, sent as soon as a visitor writes for the first time. */
export const WELCOME_MESSAGE = "Hello ! Je suis Léa, je vais t'aider à trouver ou régler ton problème.";

/** Above this, an answer is shortened (model rewrite, then a clean cut). */
export const MAX_REPLY_CHARS = 350;

function isOperatorText(message: CrispMessage) {
  return message.from === "operator" && message.type !== "note";
}

/**
 * True for a first contact: nobody from Anyloc (Léa or a human) has written
 * in this conversation yet. A conversation already under way gets no welcome.
 */
export function shouldSendWelcome(messages: CrispMessage[]) {
  return !messages.some(isOperatorText);
}

/** True when Léa's welcome is already in the conversation. */
export function hasWelcome(messages: CrispMessage[]) {
  return messages.some(
    (message) =>
      isOperatorText(message) &&
      message.user?.nickname === SUPPORT_AGENT_NICKNAME &&
      message.content === WELCOME_MESSAGE
  );
}

/**
 * Sends the welcome at most once per conversation. `claim` must succeed only
 * once per session (a unique row in support_agent_events), so two visitor
 * messages arriving together still produce a single welcome.
 */
export async function sendWelcomeOnce({
  sessionId,
  messages,
  claim,
  send,
}: {
  sessionId: string;
  messages: CrispMessage[];
  claim: (sessionId: string) => Promise<boolean>;
  send: (sessionId: string, text: string) => Promise<unknown>;
}) {
  if (!shouldSendWelcome(messages) || hasWelcome(messages)) return false;
  if (!(await claim(sessionId))) return false;
  await send(sessionId, WELCOME_MESSAGE);
  return true;
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Last resort after the rewrite: keeps whole sentences (or lines) up to
 * `max` characters. A single sentence longer than that is cut on a word,
 * with an ellipsis. Text already short enough is returned as is.
 */
export function fitReplyLength(text: string, max = MAX_REPLY_CHARS) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;

  let kept = "";
  for (const sentence of splitSentences(trimmed)) {
    const next = kept ? `${kept} ${sentence}` : sentence;
    if (next.length > max) break;
    kept = next;
  }
  if (kept) return kept;

  const cut = trimmed.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:–-]+$/, "")}…`;
}

export function isTooLong(text: string, max = MAX_REPLY_CHARS) {
  return text.trim().length > max;
}

type ReplyDecision =
  | { action: "reply"; reply: string; internalNote: string }
  | { action: "escalate"; reply: string; internalNote: string; reason: string }
  | { action: "ignore"; internalNote: string };

/**
 * Keeps an answer under MAX_REPLY_CHARS: asks for a short version first (only
 * when too long), then cuts cleanly if that's still too long or fails.
 */
export async function enforceReplyLength<D extends ReplyDecision>(
  decision: D,
  shorten: (reply: string) => Promise<string | null>
): Promise<D> {
  if (decision.action === "ignore" || !isTooLong(decision.reply)) return decision;

  let shorter: string | null = null;
  try {
    shorter = await shorten(decision.reply);
  } catch {
    shorter = null;
  }
  const reply = fitReplyLength(shorter && shorter.trim() ? shorter : decision.reply);
  return {
    ...decision,
    reply,
    internalNote: `${decision.internalNote}\n\nRéponse raccourcie (${decision.reply.length} → ${reply.length} caractères).`,
  };
}
