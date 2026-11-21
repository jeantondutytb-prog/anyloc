import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTIVATION_HELP_DELAY_MS,
  buildActivationHelpEmail,
  getActivationHelpSendAt,
  isActivationHelpEmailEnabled,
  toActivationSource,
} from "./activation";

describe("activation", () => {
  it("keeps the help email off unless ACTIVATION_HELP_EMAIL is on", () => {
    assert.equal(isActivationHelpEmailEnabled({}), false);
    assert.equal(isActivationHelpEmailEnabled({ ACTIVATION_HELP_EMAIL: "1" }), false);
    assert.equal(isActivationHelpEmailEnabled({ ACTIVATION_HELP_EMAIL: "on" }), true);
  });

  it("sends the help email one hour after the purchase", () => {
    const purchasedAt = new Date("2026-11-20T10:00:00Z");
    assert.equal(ACTIVATION_HELP_DELAY_MS, 3_600_000);
    assert.equal(getActivationHelpSendAt(purchasedAt).toISOString(), "2026-11-20T11:00:00.000Z");
  });

  it("maps device platforms to an activation source", () => {
    assert.equal(toActivationSource("android"), "android");
    assert.equal(toActivationSource("ios"), "ios");
    assert.equal(toActivationSource("mac"), "desktop");
    assert.equal(toActivationSource("windows"), "desktop");
    assert.equal(toActivationSource(null), "unknown");
  });

  it("builds the help email with a tracked link to the dashboard", () => {
    const email = buildActivationHelpEmail({ appUrl: "https://www.anyloc.io" });
    const link =
      "https://www.anyloc.io/dashboard?utm_source=email&utm_medium=email&utm_campaign=activation_help";
    assert.equal(email.subject, "Un coup de main pour installer Anyloc ?");
    assert.ok(email.text.includes(link));
    assert.ok(email.html.includes(link.replace(/&/g, "&amp;")));
    assert.ok(email.text.includes("1. Ouvre ton espace Anyloc"));
    assert.ok(email.html.includes("<ol"));
  });
});
