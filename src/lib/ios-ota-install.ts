import { createHmac, timingSafeEqual } from "node:crypto";
import { getAppUrl } from "@/lib/stripe";

const IOS_BUNDLE_ID = "io.anyloc.app";
const IOS_APP_TITLE = "Anyloc";
const IOS_BUNDLE_VERSION = "1.0";
const TOKEN_TTL_MS = 60 * 60 * 1000;

type InstallTokenPayload = {
  userId: string;
  exp: number;
};

function getInstallTokenSecret() {
  return (
    process.env.IOS_OTA_INSTALL_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createIosInstallToken(userId: string) {
  const secret = getInstallTokenSecret();

  if (!secret) {
    return null;
  }

  const payload: InstallTokenPayload = {
    userId,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encoded, secret);

  return `${encoded}.${signature}`;
}

export function verifyIosInstallToken(token: string | null | undefined) {
  const secret = getInstallTokenSecret();

  if (!secret || !token) {
    return null;
  }

  const [encoded, signature] = token.split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = signPayload(encoded, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as InstallTokenPayload;

    if (!payload.userId || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function buildIosManifestPlist(ipaUrl: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key>
          <string>software-package</string>
          <key>url</key>
          <string>${escapeXml(ipaUrl)}</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${IOS_BUNDLE_ID}</string>
        <key>bundle-version</key>
        <string>${IOS_BUNDLE_VERSION}</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${IOS_APP_TITLE}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildIosOtaInstallUrl(manifestUrl: string) {
  const encoded = encodeURIComponent(manifestUrl);
  return `itms-services://?action=download-manifest&url=${encoded}`;
}

export function getIosManifestUrl(token: string) {
  const baseUrl = getAppUrl().replace(/\/$/, "");
  return `${baseUrl}/api/ios/manifest?token=${encodeURIComponent(token)}`;
}
