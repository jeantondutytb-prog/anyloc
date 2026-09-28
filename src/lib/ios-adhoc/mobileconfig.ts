import { createHash, randomBytes } from "node:crypto";
import plist from "plist";

export type DeviceAttributes = {
  udid: string;
  challenge: string;
  product: string | null;
  osVersion: string | null;
};

export function hashChallenge(challenge: string) {
  return createHash("sha256").update(challenge).digest("hex");
}

export function createEnrollmentChallenge() {
  const challenge = randomBytes(32).toString("base64url");
  return { challenge, hash: hashChallenge(challenge) };
}

export function buildEnrollmentProfile(input: {
  callbackUrl: string;
  challenge: string;
  profileUuid: string;
}) {
  return plist.build({
    PayloadContent: {
      URL: input.callbackUrl,
      DeviceAttributes: ["UDID", "PRODUCT", "VERSION"],
      Challenge: input.challenge,
    },
    PayloadOrganization: "Anyloc",
    PayloadDisplayName: "Anyloc — identification de l'iPhone",
    PayloadDescription:
      "Permet à Anyloc de préparer l'app pour ton iPhone. Rien n'est installé en dehors de l'app Anyloc.",
    PayloadIdentifier: "io.anyloc.enroll",
    PayloadUUID: input.profileUuid,
    PayloadVersion: 1,
    PayloadType: "Profile Service",
  });
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseDeviceAttributes(body: Buffer): DeviceAttributes | null {
  const text = body.toString("latin1");
  const start = text.indexOf("<?xml");
  const endTag = "</plist>";
  const end = text.indexOf(endTag, start);

  if (start === -1 || end === -1) {
    return null;
  }

  let parsed: unknown;
  try {
    const xml = Buffer.from(text.slice(start, end + endTag.length), "latin1").toString("utf8");
    parsed = plist.parse(xml);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const udid = readString(record, "UDID");
  const challenge = readString(record, "CHALLENGE");

  if (!udid || !challenge) {
    return null;
  }

  return {
    udid,
    challenge,
    product: readString(record, "PRODUCT"),
    osVersion: readString(record, "VERSION"),
  };
}
