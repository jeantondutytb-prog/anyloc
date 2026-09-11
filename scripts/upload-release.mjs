#!/usr/bin/env node

/**
 * Upload release artifacts to Vercel Blob.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=xxx node scripts/upload-release.mjs setup-mac apps/setup/dist/Anyloc-Setup.dmg
 *   BLOB_READ_WRITE_TOKEN=xxx node scripts/upload-release.mjs android dist/android/Anyloc.apk
 */

import fs from "node:fs";
import { put } from "@vercel/blob";

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
};

async function main() {
  const [targetKey, filePath] = process.argv.slice(2);
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!targetKey || !filePath) {
    console.error(
      "Usage: BLOB_READ_WRITE_TOKEN=xxx node scripts/upload-release.mjs <android|ios|setup-mac> <file-path>"
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

  const fileBuffer = fs.readFileSync(filePath);
  console.log(`Uploading ${filePath} (${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB)...`);

  const blob = await put(target.blobPath, fileBuffer, {
    access: "private",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 31536000,
  });

  console.log(`Upload OK: ${blob.url}`);
  console.log(`Ajoute sur Vercel → ${target.envKey}=${blob.url}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
