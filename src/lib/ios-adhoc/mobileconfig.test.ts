import assert from "node:assert/strict";
import { describe, it } from "node:test";
import plist from "plist";
import {
  buildEnrollmentProfile,
  createEnrollmentChallenge,
  hashChallenge,
  parseDeviceAttributes,
} from "./mobileconfig";

describe("buildEnrollmentProfile", () => {
  it("builds a Profile Service payload asking for the UDID", () => {
    const xml = buildEnrollmentProfile({
      callbackUrl: "https://www.anyloc.io/api/ios/enroll/callback/abc",
      challenge: "chal",
      profileUuid: "11111111-1111-1111-1111-111111111111",
    });
    const parsed = plist.parse(xml) as Record<string, unknown>;
    assert.equal(parsed.PayloadType, "Profile Service");
    const content = parsed.PayloadContent as Record<string, unknown>;
    assert.equal(content.URL, "https://www.anyloc.io/api/ios/enroll/callback/abc");
    assert.equal(content.Challenge, "chal");
    assert.deepEqual(content.DeviceAttributes, ["UDID", "PRODUCT", "VERSION"]);
  });
});

describe("parseDeviceAttributes", () => {
  const inner = plist.build({
    UDID: "00008110-000A1B2C3D4E5F6A",
    CHALLENGE: "chal",
    PRODUCT: "iPhone15,2",
    VERSION: "22A3354",
  });

  it("extracts attributes from a PKCS#7-wrapped plist", () => {
    const body = Buffer.concat([
      Buffer.from([0x30, 0x80, 0x06, 0x09]),
      Buffer.from(inner, "utf8"),
      Buffer.from([0x00, 0x00, 0xa0]),
    ]);
    assert.deepEqual(parseDeviceAttributes(body), {
      udid: "00008110-000A1B2C3D4E5F6A",
      challenge: "chal",
      product: "iPhone15,2",
      osVersion: "22A3354",
    });
  });

  it("returns null without UDID or challenge", () => {
    assert.equal(parseDeviceAttributes(Buffer.from("garbage")), null);
    const noUdid = plist.build({ CHALLENGE: "chal" });
    assert.equal(parseDeviceAttributes(Buffer.from(noUdid)), null);
  });
});

describe("challenge", () => {
  it("hash matches the generated challenge", () => {
    const { challenge, hash } = createEnrollmentChallenge();
    assert.ok(challenge.length >= 32);
    assert.equal(hashChallenge(challenge), hash);
  });
});
