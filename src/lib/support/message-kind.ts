import { SUPPORT_AGENT_NICKNAME, type CrispMessage } from "@/lib/support/crisp-api";

/**
 * Who really wrote an operator message. Crisp puts more than human answers on
 * the operator side: its own automated messages (email request, bots,
 * triggers: `automated`, an `urn:` origin, field/picker/event types) and
 * Léa's messages. Only a person from the team should make Léa step back.
 */

/** Message types a person types in the inbox. */
const TEAM_TYPES = new Set(["text", "file", "animation", "audio"]);

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** Typed by Anyloc (a person or Léa), not by Crisp itself. */
export function isTeamText(message: CrispMessage) {
  if (message.from !== "operator" || !TEAM_TYPES.has(message.type) || message.automated) {
    return false;
  }
  // `urn:crisp.im:…` = bots, triggers, plugins. Missing origin: keep the message.
  return !message.origin || message.origin === "chat" || message.origin === "email";
}

/** Texts Léa sent in a conversation, from our own log, ready to compare. */
export function toAgentTexts(texts: (string | null | undefined)[]) {
  return new Set(texts.map(normalizeText).filter(Boolean));
}

/**
 * Léa's own message. The nickname alone isn't enough (Crisp may give back
 * another name than the one we sent), so a text Léa sent counts too.
 */
export function isAgentText(message: CrispMessage, agentTexts: Set<string> = new Set()) {
  return message.user?.nickname === SUPPORT_AGENT_NICKNAME || agentTexts.has(normalizeText(message.content));
}

/** A person from the team wrote this: Léa must leave the conversation to them. */
export function isHumanText(message: CrispMessage, agentTexts?: Set<string>) {
  return isTeamText(message) && !isAgentText(message, agentTexts);
}

/** What a message is, without its content: kept in our log when Léa steps back. */
export function describeMessage(message: CrispMessage) {
  return [
    `type=${message.type}`,
    `origin=${message.origin || "?"}`,
    `automated=${Boolean(message.automated)}`,
    `user=${message.user?.type ?? "?"}/${message.user?.nickname ?? "?"}`,
  ].join(" ");
}
