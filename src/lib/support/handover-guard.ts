import type { SupportDecision } from "@/lib/support/agent";

/**
 * Last check on Léa's answer before it reaches the customer, in code so a
 * model slip can't get through. A reply that promises a refund, offers a
 * discount, promises "zero ban", or announces a handover without doing it is
 * turned into a real handover. "Aucun risque" about the 48 h guarantee is the
 * founder's wording and stays allowed.
 */

export type HandoverGuardRule = "refund_promise" | "discount" | "ban_promise" | "announced_handover";

export const HANDOVER_GUARD_REASONS: Record<HandoverGuardRule, string> = {
  refund_promise: "Garde-fou : la réponse promettait un remboursement.",
  discount: "Garde-fou : la réponse parlait de code promo ou de réduction.",
  ban_promise: "Garde-fou : la réponse promettait zéro bannissement.",
  announced_handover: "Garde-fou : la réponse annonçait une passation sans la faire.",
};

/** Sent instead of a reply whose content must not reach the customer. */
export const GUARD_HANDOVER_REPLY =
  "Je passe ta demande à un membre de l'équipe, il reprend la conversation ici et te répond au plus vite.";

/** Lowercase, no accents, straight apostrophes, single spaces: patterns stay simple. */
export function normalizeForGuard(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function sentences(text: string) {
  return normalizeForGuard(text)
    .split(/(?<=[.!?\n])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

const REFUND_PROMISE = [
  /\b(je|on|nous) (te|vous) rembours(e|es|ons|erai|era|erons)\b/,
  /\b(je|on|nous) (vais|va|allons) (te|vous) rembourser\b/,
  /\b(tu|vous) (seras|serez|vas etre|allez etre|es|etes) rembourse(e|s)?\b/,
  /\bremboursement (est |a ete |sera )?(accepte|valide|effectue|lance|confirme|en cours|fait|ok)\b/,
  /\b(je|on) (lance|valide|accepte|fais|effectue) (ton|votre|le) remboursement\b/,
];

/** The guarantee explained as a rule ("si … ton 1er paiement est remboursé") is not a promise. */
function isGuaranteeExplanation(sentence: string) {
  return /\bsi\b/.test(sentence) || /\bgarantie\b|\b48 ?h\b/.test(sentence);
}

const DISCOUNT = [
  /\bcodes? promo\b/,
  /\bpromo(tion)?s?\b/,
  /\breductions?\b/,
  /\bremises?\b/,
  /\bgeste commercial\b/,
  /\bcoupons?\b/,
  /-\s?\d{1,2} ?%/,
];

const BAN = "ban(s|ni|nie|nis|nies|nissement|nissements)?";
const BAN_PROMISE = [
  new RegExp(`\\bzero (risque (de |d'(etre )?)?)?${BAN}\\b`),
  new RegExp(`\\b(aucun|pas de|sans|zero|jamais de) risque (de |d'(etre )?)${BAN}\\b`),
  new RegExp(`\\b(tu|vous) (ne )?(seras|serez|risques|risquez|peux|pouvez) (jamais|pas|rien)( d'?etre)? ${BAN}\\b`),
  new RegExp(`\\bjamais ${BAN}\\b`),
  /\b(100 ?%|totalement|completement) (indetectable|sans risque)\b/,
];

const ANNOUNCED_HANDOVER = [
  /\bje (passe|transmets|transfere|remonte) (ta|votre|la) (demande|question|conversation|message)\b/,
  /\bje (passe|donne) la main\b/,
  /\bje (previens|previens tout de suite|contacte) (l'equipe|un membre|quelqu'un|jean)\b/,
  /\b(un membre|quelqu'un|une personne) de (l'equipe|notre equipe) (va|reprend|te repond|revient|te recontacte|prend le relais|s'en occupe)\b/,
  /\bl'equipe (va|reprend|te repond|revient vers toi|te recontacte|prend le relais|s'en occupe)\b/,
];

/** Offering a handover ("si tu préfères, je peux…") is fine; only announcing one counts. */
function isHandoverOffer(sentence: string) {
  return /\bsi tu (veux|preferes|le souhaites)\b|\bje peux\b|\?/.test(sentence);
}

/** Which rule the text breaks, or null. Exported for tests. */
export function findGuardRule(
  text: string,
  { checkAnnouncedHandover }: { checkAnnouncedHandover: boolean }
): HandoverGuardRule | null {
  for (const sentence of sentences(text)) {
    if (REFUND_PROMISE.some((pattern) => pattern.test(sentence)) && !isGuaranteeExplanation(sentence)) {
      return "refund_promise";
    }
    if (DISCOUNT.some((pattern) => pattern.test(sentence))) {
      return "discount";
    }
    if (BAN_PROMISE.some((pattern) => pattern.test(sentence))) {
      return "ban_promise";
    }
    if (
      checkAnnouncedHandover &&
      ANNOUNCED_HANDOVER.some((pattern) => pattern.test(sentence)) &&
      !isHandoverOffer(sentence)
    ) {
      return "announced_handover";
    }
  }
  return null;
}

/**
 * Applies the guard to a decision. A risky reply becomes a handover with the
 * neutral handover message (its text never reaches the customer); a reply
 * that only announces a handover keeps its text and becomes a real one. An
 * escalation whose message is risky keeps the handover but sends the neutral
 * message.
 */
export function enforceHandover(decision: SupportDecision): {
  decision: SupportDecision;
  rule: HandoverGuardRule | null;
} {
  if (decision.action === "ignore") {
    return { decision, rule: null };
  }

  const rule = findGuardRule(decision.reply, {
    checkAnnouncedHandover: decision.action === "reply",
  });
  if (!rule) {
    return { decision, rule: null };
  }

  const reply = rule === "announced_handover" ? decision.reply : GUARD_HANDOVER_REPLY;
  const blocked =
    rule === "announced_handover" ? "" : `\n\nRéponse bloquée par le garde-fou :\n${decision.reply}`;

  if (decision.action === "escalate") {
    return {
      decision: { ...decision, reply, internalNote: `${decision.internalNote}${blocked}` },
      rule,
    };
  }

  return {
    decision: {
      action: "escalate",
      reply,
      reason: HANDOVER_GUARD_REASONS[rule],
      internalNote: `${decision.internalNote}${blocked}`,
    },
    rule,
  };
}
