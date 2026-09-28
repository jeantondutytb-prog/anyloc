#!/usr/bin/env node
// Usage: BLOB_READ_WRITE_TOKEN=… node scripts/upload-ios-adhoc.mjs <file.ipa> <blob/path.ipa>
import fs from "node:fs";
import { put } from "@vercel/blob";

const [file, pathname] = process.argv.slice(2);

if (!file || !pathname || !process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Usage: BLOB_READ_WRITE_TOKEN=… node scripts/upload-ios-adhoc.mjs <file.ipa> <blob/path.ipa>");
  process.exit(1);
}

const blob = await put(pathname, fs.createReadStream(file), {
  access: "private",
  contentType: "application/octet-stream",
  addRandomSuffix: false,
  allowOverwrite: true,
  token: process.env.BLOB_READ_WRITE_TOKEN,
});

console.log(blob.pathname);
