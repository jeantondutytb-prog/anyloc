import { createHmac, timingSafeEqual } from "node:crypto";
import plist from "plist";

export type InstallTokenPayload = { userId: string; buildId: string; exp: number };

function signature(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function signInstallToken(payload: InstallTokenPayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signature(body, secret)}`;
}

export function verifyInstallToken(
  token: string,
  secret: string,
  now: number
): InstallTokenPayload | null {
  const [body, sig, extra] = token.split(".");

  if (!body || !sig || extra !== undefined) {
    return null;
  }

  const expected = Buffer.from(signature(body, secret));
  const received = Buffer.from(sig);

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as InstallTokenPayload;
    if (
      typeof payload.userId !== "string" ||
      typeof payload.buildId !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= now
    ) {
      return null;
    }
    return { userId: payload.userId, buildId: payload.buildId, exp: payload.exp };
  } catch {
    return null;
  }
}

export function buildInstallManifest(input: {
  ipaUrl: string;
  bundleId: string;
  bundleVersion: string;
  title: string;
}) {
  return plist.build({
    items: [
      {
        assets: [{ kind: "software-package", url: input.ipaUrl }],
        metadata: {
          "bundle-identifier": input.bundleId,
          "bundle-version": input.bundleVersion,
          kind: "software",
          title: input.title,
        },
      },
    ],
  });
}

export function buildItmsServicesUrl(manifestUrl: string) {
  return `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
}
