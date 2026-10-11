import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * A lockdown pairing record grants developer access to the iPhone, so it is
 * encrypted at rest (AES-256-GCM) with PAIRING_ENCRYPTION_KEY (32 bytes, base64).
 * Rows saved before the key existed stay readable as plain base64.
 */
const PREFIX = "enc:v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(secret = process.env.PAIRING_ENCRYPTION_KEY) {
  if (!secret) {
    return null;
  }

  const key = Buffer.from(secret, "base64");

  if (key.length !== 32) {
    throw new Error("PAIRING_ENCRYPTION_KEY must be 32 bytes encoded in base64.");
  }

  return key;
}

export function encryptPairing(pairing: string, secret?: string) {
  const key = getKey(secret);

  if (!key) {
    console.warn("[pairing] PAIRING_ENCRYPTION_KEY missing: pairing stored unencrypted.");
    return pairing;
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(pairing, "utf8"), cipher.final()]);

  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

export function decryptPairing(stored: string | null, secret?: string) {
  if (!stored || !stored.startsWith(PREFIX)) {
    return stored;
  }

  const key = getKey(secret);

  if (!key) {
    throw new Error("PAIRING_ENCRYPTION_KEY missing: can't read an encrypted pairing.");
  }

  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, IV_BYTES));
  decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));

  return Buffer.concat([
    decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)),
    decipher.final(),
  ]).toString("utf8");
}
