import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupportDecision } from "./agent";
import { getLastVisitorText } from "./handle-crisp-message";
import { enforceHandover, findGuardRule, GUARD_HANDOVER_REPLY, normalizeForGuard } from "./handover-guard";
import { buildErrorAlert, buildHandoverAlert, crispConversationUrl } from "./support-alerts";

function reply(text: string): SupportDecision {
  return { action: "reply", reply: text, internalNote: "note" };
}

const asReply = { checkAnnouncedHandover: true };

describe("findGuardRule", () => {
  it("catches a promised refund", () => {
    assert.equal(findGuardRule("Pas de souci, je te rembourse aujourd'hui.", asReply), "refund_promise");
    assert.equal(findGuardRule("Ton remboursement est validé, tu le verras sous 5 jours.", asReply), "refund_promise");
    assert.equal(findGuardRule("Tu seras remboursé demain.", asReply), "refund_promise");
    assert.equal(findGuardRule("On va te rembourser.", asReply), "refund_promise");
  });

  it("lets the 48 h guarantee be explained", () => {
    assert.equal(
      findGuardRule(
        "Il y a la garantie 48 h : si ta loc ne bouge pas malgré notre aide, ton 1er paiement est remboursé.",
        asReply
      ),
      null
    );
    assert.equal(findGuardRule("Tu seras remboursé si ta loc ne bouge pas malgré notre aide.", asReply), null);
  });

  it("keeps « aucun risque » about the 48 h guarantee", () => {
    assert.equal(
      findGuardRule("Pas d'essai gratuit, mais aucun risque grâce à la garantie 48 h.", asReply),
      null
    );
    assert.equal(findGuardRule("Tu peux tester sans risque avec la garantie 48 h.", asReply), null);
  });

  it("catches a discount or a promo code", () => {
    assert.equal(findGuardRule("Je te fais un code promo de 20 %.", asReply), "discount");
    assert.equal(findGuardRule("Je peux te faire une réduction.", asReply), "discount");
    assert.equal(findGuardRule("Avec -50 % le premier mois.", asReply), "discount");
    assert.equal(findGuardRule("Je te fais un geste commercial.", asReply), "discount");
  });

  it("catches a « zero ban » promise", () => {
    assert.equal(findGuardRule("C'est zéro ban, promis.", asReply), "ban_promise");
    assert.equal(findGuardRule("Aucun risque de ban avec Anyloc.", asReply), "ban_promise");
    assert.equal(findGuardRule("Aucun risque d'être banni.", asReply), "ban_promise");
    assert.equal(findGuardRule("Tu ne seras jamais banni.", asReply), "ban_promise");
  });

  it("allows the written answer about bans", () => {
    assert.equal(
      findGuardRule(
        "Snap reçoit un signal GPS normal, comme si tu étais vraiment sur place. On n'a eu aucun cas de bannissement.",
        asReply
      ),
      null
    );
  });

  it("catches a handover announced in a plain reply, not one offered", () => {
    assert.equal(findGuardRule("Je passe ta demande à l'équipe.", asReply), "announced_handover");
    assert.equal(
      findGuardRule("Un membre de l'équipe va te répondre ici.", asReply),
      "announced_handover"
    );
    assert.equal(
      findGuardRule("Si tu préfères, je peux passer ta demande à l'équipe.", asReply),
      null
    );
    assert.equal(findGuardRule("Tu veux que je passe ta demande à l'équipe ?", asReply), null);
    assert.equal(
      findGuardRule("Je passe ta demande à l'équipe.", { checkAnnouncedHandover: false }),
      null
    );
  });

  it("leaves an ordinary answer alone", () => {
    assert.equal(
      findGuardRule(
        "1. Ouvre anyloc.io/dashboard sur ton tel.\n2. Appuie sur « Télécharger l'app Anyloc ».",
        asReply
      ),
      null
    );
  });

  it("reads accents, capitals and curly apostrophes the same", () => {
    assert.equal(normalizeForGuard("Aucun RISQUE d’être Banni"), "aucun risque d'etre banni");
    assert.equal(findGuardRule("AUCUN RISQUE D’ÊTRE BANNI.", asReply), "ban_promise");
  });
});

describe("enforceHandover", () => {
  it("turns a risky reply into a handover and never sends its text", () => {
    const { decision, rule } = enforceHandover(reply("Je te rembourse, pas de souci."));
    assert.equal(rule, "refund_promise");
    assert.equal(decision.action, "escalate");
    assert.equal(decision.action === "escalate" && decision.reply, GUARD_HANDOVER_REPLY);
    assert.match(decision.action === "escalate" ? decision.reason : "", /Garde-fou/);
    assert.match(decision.internalNote, /Je te rembourse/);
  });

  it("makes an announced handover real and keeps its text", () => {
    const text = "Je passe ta demande à l'équipe, elle te répond ici.";
    const { decision, rule } = enforceHandover(reply(text));
    assert.equal(rule, "announced_handover");
    assert.equal(decision.action, "escalate");
    assert.equal(decision.action === "escalate" && decision.reply, text);
  });

  it("keeps a handover but replaces a risky handover message", () => {
    const { decision, rule } = enforceHandover({
      action: "escalate",
      reply: "Ton remboursement est accepté, l'équipe reprend ici.",
      reason: "Demande de remboursement",
      internalNote: "note",
    });
    assert.equal(rule, "refund_promise");
    assert.equal(decision.action === "escalate" && decision.reply, GUARD_HANDOVER_REPLY);
    assert.equal(decision.action === "escalate" && decision.reason, "Demande de remboursement");
  });

  it("leaves a normal handover message and a safe reply untouched", () => {
    const handover: SupportDecision = {
      action: "escalate",
      reply: "Un membre de l'équipe reprend la conversation ici et te répond au plus vite.",
      reason: "Bug",
      internalNote: "note",
    };
    assert.deepEqual(enforceHandover(handover), { decision: handover, rule: null });
    const safe = reply("Pas d'essai gratuit, mais aucun risque grâce à la garantie 48 h.");
    assert.deepEqual(enforceHandover(safe), { decision: safe, rule: null });
    const ignore: SupportDecision = { action: "ignore", internalNote: "ok merci" };
    assert.deepEqual(enforceHandover(ignore), { decision: ignore, rule: null });
  });
});

describe("support alerts", () => {
  it("links the conversation in Crisp", () => {
    assert.equal(
      crispConversationUrl("session_abc", "site-1"),
      "https://app.crisp.chat/website/site-1/inbox/session_abc/"
    );
    assert.equal(crispConversationUrl("session_abc", ""), "https://app.crisp.chat/");
  });

  it("says why Léa handed over, and escapes the customer's text", () => {
    const alert = buildHandoverAlert({
      sessionId: "session_abc",
      reason: "Demande de remboursement",
      reply: "Un membre de l'équipe reprend ici.",
      lastVisitorMessage: "<b>rembourse</b> moi",
      guardRule: null,
      websiteId: "site-1",
    });
    assert.equal(alert.subject, "Léa te passe la main");
    assert.match(alert.text, /Demande de remboursement/);
    assert.match(alert.text, /app\.crisp\.chat\/website\/site-1\/inbox\/session_abc/);
    assert.match(alert.html, /&lt;b&gt;rembourse&lt;\/b&gt; moi/);
    assert.doesNotMatch(alert.html, /<b>rembourse/);
  });

  it("names the guard rule when the guard forced the handover", () => {
    const alert = buildHandoverAlert({
      sessionId: "s",
      reason: "ignored",
      reply: GUARD_HANDOVER_REPLY,
      lastVisitorMessage: "",
      guardRule: "discount",
    });
    assert.equal(alert.subject, "Léa te passe la main (garde-fou)");
    assert.match(alert.text, /code promo ou de réduction/);
    assert.doesNotMatch(alert.text, /Dernier message du client/);
  });

  it("explains an error and the hourly limit", () => {
    const alert = buildErrorAlert({ sessionId: "s", error: "401 invalid x-api-key", websiteId: "w" });
    assert.match(alert.subject, /Léa est en erreur/);
    assert.match(alert.text, /401 invalid x-api-key/);
    assert.match(alert.text, /Un seul mail par heure/);
  });
});

describe("getLastVisitorText", () => {
  it("returns the visitor's last message", () => {
    assert.equal(
      getLastVisitorText([
        { type: "text", from: "user", origin: "chat", content: "un", fingerprint: 1, timestamp: 1 },
        { type: "text", from: "operator", origin: "chat", content: "réponse", fingerprint: 2, timestamp: 2 },
        { type: "text", from: "user", origin: "chat", content: "deux", fingerprint: 3, timestamp: 3 },
      ]),
      "deux"
    );
    assert.equal(getLastVisitorText([]), "");
  });
});
