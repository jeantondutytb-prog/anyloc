import assert from "node:assert/strict";
import { describe, it } from "node:test";
import plist from "plist";
import {
  buildInstallManifest,
  buildItmsServicesUrl,
  signInstallToken,
  verifyInstallToken,
} from "./install-link";

const SECRET = "test-secret";

describe("install token", () => {
  const payload = { userId: "u1", buildId: "b1", exp: 2_000 };

  it("round-trips before expiry", () => {
    const token = signInstallToken(payload, SECRET);
    assert.deepEqual(verifyInstallToken(token, SECRET, 1_000), payload);
  });

  it("rejects expired, tampered or wrongly signed tokens", () => {
    const token = signInstallToken(payload, SECRET);
    assert.equal(verifyInstallToken(token, SECRET, 3_000), null);
    assert.equal(verifyInstallToken(token, "other", 1_000), null);
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...payload, userId: "u2" })).toString("base64url");
    assert.equal(verifyInstallToken(`${forged}.${sig}`, SECRET, 1_000), null);
    assert.equal(verifyInstallToken(body, SECRET, 1_000), null);
    assert.equal(verifyInstallToken("", SECRET, 1_000), null);
  });
});

describe("buildInstallManifest", () => {
  it("describes a software-package asset", () => {
    const xml = buildInstallManifest({
      ipaUrl: "https://blob.example/Anyloc.ipa",
      bundleId: "io.anyloc.app",
      bundleVersion: "42",
      title: "Anyloc",
    });
    const parsed = plist.parse(xml) as {
      items: Array<{ assets: Array<{ kind: string; url: string }>; metadata: Record<string, string> }>;
    };
    assert.deepEqual(parsed.items[0].assets, [
      { kind: "software-package", url: "https://blob.example/Anyloc.ipa" },
    ]);
    assert.equal(parsed.items[0].metadata["bundle-identifier"], "io.anyloc.app");
    assert.equal(parsed.items[0].metadata["bundle-version"], "42");
    assert.equal(parsed.items[0].metadata.kind, "software");
  });
});

describe("buildItmsServicesUrl", () => {
  it("encodes the manifest URL", () => {
    assert.equal(
      buildItmsServicesUrl("https://www.anyloc.io/api/ios/manifest?t=a.b"),
      "itms-services://?action=download-manifest&url=https%3A%2F%2Fwww.anyloc.io%2Fapi%2Fios%2Fmanifest%3Ft%3Da.b"
    );
  });
});
