const fs = require("node:fs");
const path = require("node:path");

const setupDir = path.join(__dirname, "..");
const bundleDir = path.join(setupDir, "build-resources");
const ipaSources = [
  path.join(setupDir, "..", "ios", "dist", "Anyloc.ipa"),
  path.join(setupDir, "build-resources", "Anyloc.ipa"),
];

fs.mkdirSync(bundleDir, { recursive: true });

const source = ipaSources.find((candidate) => fs.existsSync(candidate));

if (source) {
  fs.copyFileSync(source, path.join(bundleDir, "Anyloc.ipa"));
  console.log(`Bundled Anyloc.ipa from ${source}`);
} else {
  const marker = path.join(bundleDir, ".ipa-missing");
  fs.writeFileSync(
    marker,
    "Anyloc.ipa will be downloaded on first launch from GitHub Releases."
  );
  console.log("No local Anyloc.ipa — Setup will download it at runtime.");
}
