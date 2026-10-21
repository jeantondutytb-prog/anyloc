import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { formatTranscript, parseDecision } from "./agent";
import { SUPPORT_AGENT_NICKNAME, verifyCrispHook, type CrispMessage } from "./crisp-api";
import { ESCALATED_SEGMENT, getSkipReason } from "./handle-crisp-message";
import { buildSupportKnowledge } from "./knowledge";

const NOW = 1_800_000_000_000;

function message(overrides: Partial<CrispMessage>): CrispMessage {
  return {
    type: "text",
    from: "user",
    origin: "chat",
    content: "Salut",
    fingerprint: 1,
    timestamp: NOW - 60_000,
    ...overrides,
  };
}

describe("verifyCrispHook", () => {
  it("accepts a plugin hook signed with the hook secret", () => {
    process.env.CRISP_HOOK_SECRET = "hook-secret";
    const rawBody = '{"event":"message:send"}';
    const signature = createHmac("sha256", "hook-secret")
      .update(`[1700000000;${rawBody}]`)
      .digest("hex");

    assert.equal(
      verifyCrispHook({ rawBody, timestamp: "1700000000", signature, urlKey: null }),
      true
    );
    assert.equal(
      verifyCrispHook({ rawBody: `${rawBody} `, timestamp: "1700000000", signature, urlKey: null }),
      false
    );
  });

  it("accepts a website hook only with the right URL key", () => {
    process.env.CRISP_WEBHOOK_KEY = "url-key";
    const base = { rawBody: "{}", timestamp: null, signature: null };

    assert.equal(verifyCrispHook({ ...base, urlKey: "url-key" }), true);
    assert.equal(verifyCrispHook({ ...base, urlKey: "nope" }), false);
    assert.equal(verifyCrispHook({ ...base, urlKey: null }), false);
  });
});

describe("getSkipReason", () => {
  it("waits for the visitor's last message", () => {
    const messages = [message({ fingerprint: 1 }), message({ fingerprint: 2 })];
    assert.equal(getSkipReason({ messages, fingerprint: 1, segments: [], mode: "live", now: NOW }), "superseded");
    assert.equal(getSkipReason({ messages, fingerprint: 2, segments: [], mode: "live", now: NOW }), null);
  });

  it("stays quiet in live mode once a human has written recently", () => {
    const messages = [
      message({ from: "operator", user: { nickname: "Jean" }, fingerprint: 5 }),
      message({ fingerprint: 6 }),
    ];
    assert.equal(getSkipReason({ messages, fingerprint: 6, segments: [], mode: "live", now: NOW }), "human_active");
    // Draft mode: the team sending answers by hand is the normal flow.
    assert.equal(getSkipReason({ messages, fingerprint: 6, segments: [], mode: "draft", now: NOW }), null);
  });

  it("ignores its own messages, notes and old human replies", () => {
    const messages = [
      message({ from: "operator", user: { nickname: "Jean" }, timestamp: NOW - 2 * 24 * 3600_000 }),
      message({ from: "operator", type: "note", user: { nickname: "Jean" } }),
      message({ from: "operator", user: { nickname: SUPPORT_AGENT_NICKNAME } }),
      message({ fingerprint: 9 }),
    ];
    assert.equal(getSkipReason({ messages, fingerprint: 9, segments: [], mode: "live", now: NOW }), null);
  });

  it("stays quiet on a conversation it handed over", () => {
    const messages = [message({ fingerprint: 3 })];
    assert.equal(
      getSkipReason({ messages, fingerprint: 3, segments: [ESCALATED_SEGMENT], mode: "live", now: NOW }),
      "human_active"
    );
  });
});

describe("parseDecision", () => {
  it("keeps a valid reply and rejects an empty one", () => {
    assert.deepEqual(
      parseDecision({ action: "reply", reply: " Salut ! ", reason: "", internal_note: "ok" }),
      { action: "reply", reply: "Salut !", internalNote: "ok" }
    );
    assert.equal(parseDecision({ action: "reply", reply: "", reason: "", internal_note: "" }), null);
    assert.equal(parseDecision({ action: "refund", reply: "x", reason: "", internal_note: "" }), null);
    assert.equal(parseDecision(null), null);
  });

  it("fills a missing escalation reason", () => {
    assert.deepEqual(parseDecision({ action: "escalate", reply: "", reason: "", internal_note: "n" }), {
      action: "escalate",
      reply: "",
      reason: "Non précisé",
      internalNote: "n",
    });
  });
});

describe("formatTranscript", () => {
  it("labels each author and leaves private notes out", () => {
    const transcript = formatTranscript([
      message({ content: "Ma loc bouge pas" }),
      message({ from: "operator", content: "Tu es sur iPhone ?", user: { nickname: SUPPORT_AGENT_NICKNAME } }),
      message({ from: "operator", type: "note", content: "secret", user: { nickname: "Jean" } }),
      message({ from: "operator", content: "Je regarde", user: { nickname: "Jean" } }),
      message({ type: "file", content: { name: "video.mp4", type: "video/mp4" } }),
    ]);

    assert.equal(
      transcript,
      [
        "Client : Ma loc bouge pas",
        "Toi (assistant) : Tu es sur iPhone ?",
        "Équipe (Jean) : Je regarde",
        "Client : [pièce jointe video/mp4 : video.mp4]",
      ].join("\n\n")
    );
  });
});

describe("buildSupportKnowledge", () => {
  it("is stable between calls, so the prompt prefix stays cached", () => {
    const knowledge = buildSupportKnowledge();
    assert.equal(knowledge, buildSupportKnowledge());
    assert.match(knowledge, /Garantie 48 h/);
    assert.match(knowledge, /Politique de remboursement/);
  });
});
