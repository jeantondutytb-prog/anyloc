import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createTrustedDeviceToken,
  isTrustedDeviceToken,
  TRUSTED_DEVICE_MAX_AGE_SECONDS,
} from "./auth-trusted-device";

const SECRET = "test-secret";
const NOW = 1_800_000_000_000;

describe("trusted device token", () => {
  it("is valid for the same email, case and spaces aside", () => {
    const token = createTrustedDeviceToken(SECRET, "Jean@Gmail.com", NOW);
    assert.equal(isTrustedDeviceToken(SECRET, " jean@gmail.com ", token, NOW + 1), true);
  });

  it("does not hold the email in clear", () => {
    assert.ok(!createTrustedDeviceToken(SECRET, "jean@gmail.com", NOW).includes("jean"));
  });

  it("is refused for another email, another secret, or a tampered token", () => {
    const token = createTrustedDeviceToken(SECRET, "jean@gmail.com", NOW);
    assert.equal(isTrustedDeviceToken(SECRET, "other@gmail.com", token, NOW), false);
    assert.equal(isTrustedDeviceToken("other-secret", "jean@gmail.com", token, NOW), false);
    const [expiry, signature] = token.split(".");
    assert.equal(isTrustedDeviceToken(SECRET, "jean@gmail.com", `${Number(expiry) + 1}.${signature}`, NOW), false);
    assert.equal(isTrustedDeviceToken(SECRET, "jean@gmail.com", `${expiry}.x${signature.slice(1)}`, NOW), false);
  });

  it("expires after 30 days and rejects empty or malformed values", () => {
    const token = createTrustedDeviceToken(SECRET, "jean@gmail.com", NOW);
    assert.equal(isTrustedDeviceToken(SECRET, "jean@gmail.com", token, NOW + TRUSTED_DEVICE_MAX_AGE_SECONDS * 1000), false);
    assert.equal(isTrustedDeviceToken(SECRET, "jean@gmail.com", undefined, NOW), false);
    assert.equal(isTrustedDeviceToken(SECRET, "jean@gmail.com", "garbage", NOW), false);
  });
});
