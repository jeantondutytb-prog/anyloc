import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";
import { decryptPairing, encryptPairing } from "./pairing-crypto";

const KEY = randomBytes(32).toString("base64");
const PAIRING = Buffer.from("<plist>pairing record</plist>").toString("base64");

describe("pairing encryption", () => {
  it("round-trips and never stores the plain record", () => {
    const stored = encryptPairing(PAIRING, KEY);

    assert.ok(stored.startsWith("enc:v1:"));
    assert.ok(!stored.includes(PAIRING));
    assert.equal(decryptPairing(stored, KEY), PAIRING);
  });

  it("uses a fresh IV each time", () => {
    assert.notEqual(encryptPairing(PAIRING, KEY), encryptPairing(PAIRING, KEY));
  });

  it("reads rows saved before encryption as-is", () => {
    assert.equal(decryptPairing(PAIRING, KEY), PAIRING);
    assert.equal(decryptPairing(null, KEY), null);
  });

  it("rejects a tampered or foreign-key record", () => {
    const stored = encryptPairing(PAIRING, KEY);
    const tampered = stored.slice(0, -4) + (stored.endsWith("AAAA") ? "BBBB" : "AAAA");

    assert.throws(() => decryptPairing(tampered, KEY));
    assert.throws(() => decryptPairing(stored, randomBytes(32).toString("base64")));
  });

  it("refuses a key of the wrong size", () => {
    assert.throws(() => encryptPairing(PAIRING, randomBytes(16).toString("base64")));
  });
});
