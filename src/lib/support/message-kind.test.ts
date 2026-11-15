import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTranscript } from "./agent";
import { SUPPORT_AGENT_NICKNAME, type CrispMessage } from "./crisp-api";
import { getSkipReason } from "./handle-crisp-message";
import { describeMessage, isHumanText, toAgentTexts } from "./message-kind";
import { sendWelcomeOnce, shouldSendWelcome, WELCOME_MESSAGE } from "./reply-shape";

const NOW = 1_800_000_000_000;

function msg(overrides: Partial<CrispMessage>): CrispMessage {
  return {
    type: "text",
    from: "user",
    origin: "chat",
    content: "bonjour ma loc ne bouge pas",
    fingerprint: 1,
    timestamp: NOW - 5_000,
    ...overrides,
  };
}

// What Crisp may put on the operator side right after a visitor's message.
const crispEmailField = msg({
  from: "operator",
  type: "field",
  origin: "chat",
  content: { id: "email", text: "Laisse ton email pour être prévenu", explain: "email@exemple.com" },
  fingerprint: 2,
  user: { nickname: "Anyloc", type: "website" },
});
const crispAutomatedText = msg({
  from: "operator",
  content: "On revient vers toi par email si tu pars.",
  automated: true,
  fingerprint: 3,
  user: { nickname: "Anyloc", type: "website" },
});
const crispBotText = msg({
  from: "operator",
  origin: "urn:crisp.im:bot:0",
  content: "Bonjour, comment puis-je aider ?",
  fingerprint: 4,
  user: { nickname: "Anyloc" },
});
const crispEvent = msg({ from: "operator", type: "event", content: { namespace: "state:resolved" }, fingerprint: 5 });
// Léa's welcome as Crisp may give it back: with another nickname than ours.
const welcomeRenamed = msg({ from: "operator", content: WELCOME_MESSAGE, fingerprint: 6, user: { nickname: "Jean" } });
const human = msg({ from: "operator", content: "Je regarde ton compte", fingerprint: 7, user: { nickname: "Jean" } });

const visitorFirst = msg({ fingerprint: 1, timestamp: NOW - 10_000 });

describe("Crisp automated message right after the visitor's message", () => {
  const agentTexts = toAgentTexts([WELCOME_MESSAGE]);

  for (const [name, automated] of [
    ["email request (field)", crispEmailField],
    ["automated text", crispAutomatedText],
    ["bot (urn: origin)", crispBotText],
    ["event", crispEvent],
  ] as const) {
    it(`${name}: never counts as a human, Léa still answers`, () => {
      assert.equal(isHumanText(automated, agentTexts), false);
      const messages = [visitorFirst, automated];
      assert.equal(getSkipReason({ messages, fingerprint: 1, segments: [], agentTexts, mode: "live", now: NOW }), null);
    });
  }

  it("Jean's test: visitor, welcome, email request → Léa answers", () => {
    const welcome = msg({
      from: "operator",
      content: WELCOME_MESSAGE,
      fingerprint: 8,
      user: { nickname: SUPPORT_AGENT_NICKNAME },
    });
    const messages = [visitorFirst, welcome, crispEmailField];
    assert.equal(getSkipReason({ messages, fingerprint: 1, segments: [], agentTexts, mode: "live", now: NOW }), null);
  });

  it("recognises Léa's messages by their text when Crisp changes the name", () => {
    const reply = "Tu as un iPhone ou un Android ?";
    const texts = toAgentTexts([WELCOME_MESSAGE, reply]);
    const messages = [
      visitorFirst,
      welcomeRenamed,
      msg({ from: "operator", content: `${reply}\n`, fingerprint: 9, user: { nickname: "Anyloc" } }),
      msg({ fingerprint: 10 }),
    ];
    assert.equal(getSkipReason({ messages, fingerprint: 10, segments: [], agentTexts: texts, mode: "live", now: NOW }), null);
  });

  it("still steps back for a real person from the team", () => {
    const messages = [visitorFirst, crispEmailField, human, msg({ fingerprint: 11 })];
    assert.equal(
      getSkipReason({ messages, fingerprint: 11, segments: [], agentTexts, mode: "live", now: NOW }),
      "human_active"
    );
  });

  it("a Crisp automated message doesn't stop the welcome", async () => {
    assert.equal(shouldSendWelcome([visitorFirst, crispEmailField, crispAutomatedText]), true);
    const sent: string[] = [];
    await sendWelcomeOnce({
      sessionId: "s",
      messages: [visitorFirst, crispEmailField],
      claim: async () => true,
      send: async (_id, text) => void sent.push(text),
    });
    assert.deepEqual(sent, [WELCOME_MESSAGE]);
  });

  it("leaves Crisp's automated messages out of what the model reads", () => {
    const transcript = formatTranscript([visitorFirst, welcomeRenamed, crispEmailField, crispBotText], agentTexts);
    assert.equal(transcript, `Client : bonjour ma loc ne bouge pas\n\nToi (assistant) : ${WELCOME_MESSAGE}`);
  });

  it("describes a message without its content, for the log", () => {
    const text = describeMessage(crispEmailField);
    assert.equal(text, "type=field origin=chat automated=false user=website/Anyloc");
    assert.doesNotMatch(describeMessage(human), /Je regarde/);
  });
});
