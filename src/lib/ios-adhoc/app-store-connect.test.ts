import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { describe, it } from "node:test";
import { createAscClient, createAscToken } from "./app-store-connect";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const creds = {
  keyId: "KEY123",
  issuerId: "issuer-uuid",
  privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
};

type Call = { url: string; method: string; body: unknown };

function fakeFetch(responses: Array<{ status: number; json?: unknown }>) {
  const calls: Call[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected call ${url}`);
    return new Response(next.json === undefined ? null : JSON.stringify(next.json), {
      status: next.status,
    });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("createAscToken", () => {
  it("produces a verifiable ES256 JWT for App Store Connect", () => {
    const token = createAscToken(creds, 1_000);
    const [h, p, s] = token.split(".");
    assert.deepEqual(JSON.parse(Buffer.from(h, "base64url").toString()), {
      alg: "ES256",
      kid: "KEY123",
      typ: "JWT",
    });
    assert.deepEqual(JSON.parse(Buffer.from(p, "base64url").toString()), {
      iss: "issuer-uuid",
      iat: 1_000,
      exp: 1_900,
      aud: "appstoreconnect-v1",
    });
    const ok = verify(
      "sha256",
      Buffer.from(`${h}.${p}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(s, "base64url")
    );
    assert.equal(ok, true);
  });
});

describe("registerDevice", () => {
  it("creates the device", async () => {
    const { impl, calls } = fakeFetch([{ status: 201, json: { data: { id: "DEV1" } } }]);
    const id = await createAscClient(creds, impl).registerDevice("UDID-1", "Anyloc u1");
    assert.equal(id, "DEV1");
    assert.equal(calls[0].url, "https://api.appstoreconnect.apple.com/v1/devices");
    assert.equal(calls[0].method, "POST");
    assert.deepEqual(calls[0].body, {
      data: { type: "devices", attributes: { name: "Anyloc u1", udid: "UDID-1", platform: "IOS" } },
    });
  });

  it("reuses an already registered device on 409", async () => {
    const { impl, calls } = fakeFetch([
      { status: 409, json: { errors: [{ detail: "already exists" }] } },
      { status: 200, json: { data: [{ id: "DEV9" }] } },
    ]);
    assert.equal(await createAscClient(creds, impl).registerDevice("UDID-1", "x"), "DEV9");
    assert.equal(
      calls[1].url,
      "https://api.appstoreconnect.apple.com/v1/devices?filter[udid]=UDID-1&limit=1"
    );
  });

  it("throws on other errors", async () => {
    const { impl } = fakeFetch([{ status: 403, json: { errors: [{ detail: "forbidden" }] } }]);
    await assert.rejects(createAscClient(creds, impl).registerDevice("U", "x"), /HTTP 403/);
  });
});

describe("profiles", () => {
  it("lists devices, deletes old profiles and creates the ad hoc profile", async () => {
    const { impl, calls } = fakeFetch([
      { status: 200, json: { data: [{ id: "D1", attributes: { udid: "U1" } }] } },
      { status: 200, json: { data: [{ id: "P-old" }] } },
      { status: 204 },
      { status: 201, json: { data: { attributes: { profileContent: "BASE64" } } } },
    ]);
    const asc = createAscClient(creds, impl);
    assert.deepEqual(await asc.listEnabledIosDevices(), [{ id: "D1", udid: "U1" }]);
    await asc.deleteProfilesNamed("Anyloc AdHoc");
    const content = await asc.createAdhocProfile({
      name: "Anyloc AdHoc",
      bundleIdId: "B1",
      certificateId: "C1",
      deviceIds: ["D1"],
    });
    assert.equal(content, "BASE64");
    assert.equal(calls[2].method, "DELETE");
    assert.equal(calls[2].url, "https://api.appstoreconnect.apple.com/v1/profiles/P-old");
    assert.deepEqual(calls[3].body, {
      data: {
        type: "profiles",
        attributes: { name: "Anyloc AdHoc", profileType: "IOS_APP_ADHOC" },
        relationships: {
          bundleId: { data: { type: "bundleIds", id: "B1" } },
          certificates: { data: [{ type: "certificates", id: "C1" }] },
          devices: { data: [{ type: "devices", id: "D1" }] },
        },
      },
    });
  });
});
