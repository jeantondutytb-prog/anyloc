#!/usr/bin/env node

/**
 * Upload release artifacts to Vercel Blob.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=xxx node scripts/upload-release.mjs android dist/android/Anyloc.apk
 *   BLOB_READ_WRITE_TOKEN=xxx node scripts/upload-release.mjs setup-mac apps/setup/dist/Anyloc-Setup.dmg
 */

const fs = require("node:fs");
const path = require("node:path");

const TARGETS = {
  android: {
    envKey: "ANYLOC_DOWNLOAD_APK",
    blobPath: "releases/Anyloc.apk",
  },
  ios: {
    envKey: "ANYLOC_DOWNLOAD_IPA",
    blobPath: "releases/Anyloc.ipa",
  },
  "setup-mac": {
    envKey: "ANYLOC_DOWNLOAD_SETUP_MAC",
    blobPath: "releases/Anyloc-Setup.dmg",
  },
  "setup-win": {
    envKey: "ANYLOC_DOWNLOAD_SETUP_WIN",
    blobPath: "releases/Anyloc-Setup.exe",
  },
};

async function upload({ filePath, blobPath, token }) {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const response = await fetch(
    `https://blob.vercel-storage.com/${blobPath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-content-type": "application/octet-stream",
        "x-file-name": fileName,
      },
      body: fileBuffer,
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Upload failed (${response.status}): ${body}`);
  }

  return response.json();
}

async function main() {
  const [targetKey, filePath] = process.argv.slice(2);
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!targetKey || !filePath) {
    console.error(
      "Usage: BLOB_READ_WRITE_TOKEN=xxx node scripts/upload-release.mjs <android|ios|setup-mac|setup-win> <file-path>"
    );
    process.exit(1);
  }

  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN manquant.");
    process.exit(1);
  }

  const target = TARGETS[targetKey];

  if (!target) {
    console.error(`Target inconnu: ${targetKey}`);
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Fichier introuvable: ${filePath}`);
    process.exit(1);
  }

  const result = await upload({
    filePath,
    blobPath: target.blobPath,
    token,
  });

  console.log(`Upload OK: ${result.url}`);
  console.log(`Ajoute sur Vercel → ${target.envKey}=${result.url}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
