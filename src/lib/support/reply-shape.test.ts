import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupportDecision } from "./agent";
import { SUPPORT_AGENT_NICKNAME, type CrispMessage } from "./crisp-api";
import {
  enforceReplyLength,
  fitReplyLength,
  isTooLong,
  MAX_REPLY_CHARS,
  sendWelcomeOnce,
  shouldSendWelcome,
  WELCOME_MESSAGE,
} from "./reply-shape";

function visitor(content: string, fingerprint = 1): CrispMessage {
  return { type: "text", from: "user", origin: "chat", content, fingerprint, timestamp: Date.now() };
}

function operator(content: string, nickname = "Jean", type = "text"): CrispMessage {
  return {
    type,
    from: "operator",
    origin: "chat",
    content,
    fingerprint: 99,
    timestamp: Date.now(),
    user: { nickname },
  };
}

/** Same rule as the unique (session_id, fingerprint) row: one claim per session. */
function makeClaim() {
  const claimed = new Set<string>();
  return async (sessionId: string) => {
    if (claimed.has(sessionId)) return false;
    claimed.add(sessionId);
    return true;
  };
}

function makeSend() {
  const sent: { sessionId: string; text: string }[] = [];
  return { sent, send: async (sessionId: string, text: string) => void sent.push({ sessionId, text }) };
}

describe("welcome message", () => {
  it("is Jean's exact wording", () => {
    assert.equal(WELCOME_MESSAGE, "Hello ! Je suis Léa, je vais t'aider à trouver ou régler ton problème.");
  });

  it("is sent on a visitor's first message, with that exact text", async () => {
    const { sent, send } = makeSend();
    const done = await sendWelcomeOnce({
      sessionId: "s1",
      messages: [visitor("Bonjour, ça marche pas")],
      claim: makeClaim(),
      send,
    });
    assert.equal(done, true);
    assert.deepEqual(sent, [{ sessionId: "s1", text: WELCOME_MESSAGE }]);
  });

  it("is sent only once per conversation, even for messages handled at the same time", async () => {
    const { sent, send } = makeSend();
    const claim = makeClaim();
    const messages = [visitor("Salut", 1), visitor("j'ai un souci", 2)];
    const results = await Promise.all([
      sendWelcomeOnce({ sessionId: "s2", messages, claim, send }),
      sendWelcomeOnce({ sessionId: "s2", messages, claim, send }),
    ]);
    await sendWelcomeOnce({ sessionId: "s2", messages: [...messages, visitor("?", 3)], claim, send });
    assert.deepEqual(results.sort(), [false, true]);
    assert.equal(sent.length, 1);
  });

  it("is not sent again once Léa (or anyone from Anyloc) has written", async () => {
    const { sent, send } = makeSend();
    const afterWelcome = [visitor("Salut"), operator(WELCOME_MESSAGE, SUPPORT_AGENT_NICKNAME), visitor("re")];
    const afterHuman = [visitor("Salut"), operator("Je regarde", "Jean"), visitor("merci")];
    assert.equal(await sendWelcomeOnce({ sessionId: "s3", messages: afterWelcome, claim: makeClaim(), send }), false);
    assert.equal(await sendWelcomeOnce({ sessionId: "s4", messages: afterHuman, claim: makeClaim(), send }), false);
    assert.equal(sent.length, 0);
  });

  it("ignores private notes: a note alone doesn't count as an answer", () => {
    assert.equal(shouldSendWelcome([visitor("Salut"), operator("[IA] note", SUPPORT_AGENT_NICKNAME, "note")]), true);
  });
});

describe("length guard", () => {
  const long =
    "Pour régler ça, ouvre l'app Anyloc sur ton ordinateur. Branche ton iPhone avec le câble. " +
    "Clique sur « Se fier à cet ordinateur » sur l'iPhone. Ensuite choisis la position sur la carte. " +
    "Puis clique sur Démarrer et attends quelques secondes. Si ça ne marche pas, redémarre l'iPhone. " +
    "Et si ça ne marche toujours pas, écris-nous ici avec une capture d'écran du message d'erreur.";

  it("leaves a short answer untouched", () => {
    const text = "Branche ton iPhone avec le câble, puis dis-moi ce que tu vois.";
    assert.equal(fitReplyLength(text), text);
    assert.equal(isTooLong(text), false);
  });

  it("cuts a long answer on whole sentences, under the limit", () => {
    assert.ok(long.length > MAX_REPLY_CHARS);
    const cut = fitReplyLength(long);
    assert.ok(cut.length <= MAX_REPLY_CHARS, `${cut.length} > ${MAX_REPLY_CHARS}`);
    assert.ok(long.startsWith(cut));
    assert.match(cut, /[.!?]$/);
  });

  it("cuts one endless sentence on a word, with an ellipsis", () => {
    const sentence = `Il faut ${"vraiment ".repeat(80)}tout recommencer`;
    const cut = fitReplyLength(sentence);
    assert.ok(cut.length <= MAX_REPLY_CHARS);
    assert.match(cut, /vraiment…$/);
  });

  it("uses the short rewrite when the answer is too long", async () => {
    const decision: SupportDecision = { action: "reply", reply: long, internalNote: "note" };
    const out = await enforceReplyLength(decision, async () => "Ouvre l'app sur ton ordi et branche ton iPhone.");
    assert.equal(out.action, "reply");
    assert.equal(out.action === "reply" && out.reply, "Ouvre l'app sur ton ordi et branche ton iPhone.");
    assert.match(out.internalNote, /raccourcie/);
  });

  it("still cuts cleanly when the rewrite fails or stays too long", async () => {
    const decision: SupportDecision = { action: "reply", reply: long, internalNote: "note" };
    const failed = await enforceReplyLength(decision, async () => {
      throw new Error("API down");
    });
    const tooLong = await enforceReplyLength(decision, async () => long);
    for (const out of [failed, tooLong]) {
      assert.ok(out.action === "reply" && out.reply.length <= MAX_REPLY_CHARS);
    }
  });

  it("never calls the rewrite for a short answer or an ignore", async () => {
    let calls = 0;
    const shorten = async () => {
      calls += 1;
      return "x";
    };
    await enforceReplyLength({ action: "reply", reply: "Oui, c'est compatible.", internalNote: "" }, shorten);
    await enforceReplyLength({ action: "ignore", internalNote: "merci" }, shorten);
    assert.equal(calls, 0);
  });

  it("applies to a handover message too", async () => {
    const out = await enforceReplyLength(
      { action: "escalate", reply: long, internalNote: "", reason: "remboursement" },
      async () => null
    );
    assert.ok(out.action === "escalate" && out.reply.length <= MAX_REPLY_CHARS);
  });
});
