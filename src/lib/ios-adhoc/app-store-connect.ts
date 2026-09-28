import { createPrivateKey, sign } from "node:crypto";

const ASC_BASE_URL = "https://api.appstoreconnect.apple.com";
const TOKEN_LIFETIME_SECONDS = 15 * 60;

export type AscCredentials = { keyId: string; issuerId: string; privateKey: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AscResponse = { status: number; json: any };

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export function createAscToken(
  creds: AscCredentials,
  nowSeconds = Math.floor(Date.now() / 1000)
) {
  const header = { alg: "ES256", kid: creds.keyId, typ: "JWT" };
  const payload = {
    iss: creds.issuerId,
    iat: nowSeconds,
    exp: nowSeconds + TOKEN_LIFETIME_SECONDS,
    aud: "appstoreconnect-v1",
  };
  const input = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = sign("sha256", Buffer.from(input), {
    key: createPrivateKey(creds.privateKey),
    dsaEncoding: "ieee-p1363",
  });
  return `${input}.${base64url(signature)}`;
}

function describeError(label: string, response: AscResponse) {
  const detail = response.json?.errors?.[0]?.detail ?? "";
  return new Error(`${label}: HTTP ${response.status} ${detail}`.trim());
}

export function createAscClient(creds: AscCredentials, fetchImpl: typeof fetch = fetch) {
  async function request(
    path: string,
    init: { method?: string; body?: unknown } = {}
  ): Promise<AscResponse> {
    const response = await fetchImpl(`${ASC_BASE_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${createAscToken(creds)}`,
        "Content-Type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await response.text();
    return { status: response.status, json: text ? JSON.parse(text) : null };
  }

  return {
    async registerDevice(udid: string, name: string) {
      const created = await request("/v1/devices", {
        method: "POST",
        body: { data: { type: "devices", attributes: { name, udid, platform: "IOS" } } },
      });

      if (created.status === 201) {
        return created.json.data.id as string;
      }

      if (created.status === 409) {
        const existing = await request(
          `/v1/devices?filter[udid]=${encodeURIComponent(udid)}&limit=1`
        );
        const id = existing.json?.data?.[0]?.id;
        if (existing.status === 200 && typeof id === "string") {
          return id;
        }
      }

      throw describeError("registerDevice", created);
    },

    async listEnabledIosDevices() {
      const response = await request(
        "/v1/devices?filter[platform]=IOS&filter[status]=ENABLED&limit=200"
      );
      if (response.status !== 200) throw describeError("listDevices", response);
      return (response.json.data as Array<{ id: string; attributes: { udid: string } }>).map(
        (device) => ({ id: device.id, udid: device.attributes.udid })
      );
    },

    async findBundleIdId(identifier: string) {
      const response = await request(
        `/v1/bundleIds?filter[identifier]=${encodeURIComponent(identifier)}&limit=1`
      );
      const id = response.json?.data?.[0]?.id;
      if (response.status !== 200 || typeof id !== "string") {
        throw describeError(`findBundleId ${identifier}`, response);
      }
      return id;
    },

    async deleteProfilesNamed(name: string) {
      const response = await request(
        `/v1/profiles?filter[name]=${encodeURIComponent(name)}&limit=200`
      );
      if (response.status !== 200) throw describeError("listProfiles", response);
      for (const profile of response.json.data as Array<{ id: string }>) {
        const deleted = await request(`/v1/profiles/${profile.id}`, { method: "DELETE" });
        if (deleted.status !== 204) throw describeError("deleteProfile", deleted);
      }
    },

    async createAdhocProfile(input: {
      name: string;
      bundleIdId: string;
      certificateId: string;
      deviceIds: string[];
    }) {
      const response = await request("/v1/profiles", {
        method: "POST",
        body: {
          data: {
            type: "profiles",
            attributes: { name: input.name, profileType: "IOS_APP_ADHOC" },
            relationships: {
              bundleId: { data: { type: "bundleIds", id: input.bundleIdId } },
              certificates: { data: [{ type: "certificates", id: input.certificateId }] },
              devices: { data: input.deviceIds.map((id) => ({ type: "devices", id })) },
            },
          },
        },
      });
      const content = response.json?.data?.attributes?.profileContent;
      if (response.status !== 201 || typeof content !== "string") {
        throw describeError("createProfile", response);
      }
      return content;
    },
  };
}

export function ascCredentialsFromEnv(env: NodeJS.ProcessEnv = process.env): AscCredentials {
  const keyId = env.ASC_KEY_ID?.trim();
  const issuerId = env.ASC_ISSUER_ID?.trim();
  const privateKey = env.ASC_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!keyId || !issuerId || !privateKey) {
    throw new Error("ASC_KEY_ID, ASC_ISSUER_ID et ASC_PRIVATE_KEY sont requis.");
  }
  return { keyId, issuerId, privateKey };
}
