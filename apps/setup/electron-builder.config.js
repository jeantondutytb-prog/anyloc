const { execFileSync } = require("node:child_process");
const path = require("node:path");

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: "io.anyloc.setup",
  productName: "Anyloc",
  executableName: "Anyloc",
  copyright: "Copyright © Anyloc",
  artifactName: "Anyloc.${ext}",
  directories: {
    output: "dist",
  },
  extraMetadata: {
    name: "Anyloc",
    description: "Anyloc — GPS iPhone via USB",
    author: "Anyloc",
  },
  files: ["src/**/*", "package.json"],
  extraResources: [
    {
      from: "scripts",
      to: "scripts",
      filter: ["**/*"],
    },
  ],
  mac: {
    category: "public.app-category.utilities",
    target: ["dmg"],
    identity: process.env.APPLE_IDENTITY || null,
    gatekeeperAssess: false,
    // Notarization only works on a Developer ID-signed build and needs all
    // three credentials; otherwise electron-builder fails or silently skips.
    notarize: Boolean(
      process.env.APPLE_IDENTITY &&
        process.env.APPLE_ID &&
        process.env.APPLE_APP_SPECIFIC_PASSWORD &&
        process.env.APPLE_TEAM_ID
    ),
  },
  dmg: {
    contents: [
      { x: 130, y: 220, type: "file" },
      { x: 410, y: 220, type: "link", path: "/Applications" },
    ],
  },
  afterPack(context) {
    if (process.platform !== "darwin") return;
    if (process.env.APPLE_IDENTITY) return;
    const appPath = path.join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`
    );
    try {
      execFileSync("codesign", ["--deep", "--force", "--sign", "-", appPath], {
        stdio: "inherit",
      });
    } catch {}
  },
  win: {
    target: ["nsis"],
    // Distinct from the installed Anyloc.exe so: Chrome cache of the old
    // installer is bypassed, and NSIS can taskkill the running app safely.
    artifactName: "Anyloc-Setup.${ext}",
    // Keep rcedit so the EXE has ProductName / CompanyName even when unsigned.
    // Signing still skips unless WIN_CSC_LINK (or CSC_LINK) is provided in CI.
    signAndEditExecutable: true,
    requestedExecutionLevel: "asInvoker",
    legalTrademarks: "Anyloc",
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Anyloc",
    uninstallDisplayName: "Anyloc",
    installerLanguages: ["fr_FR", "en_US"],
    include: path.join(__dirname, "build", "installer.nsh"),
    runAfterFinish: true,
  },
  protocols: [
    {
      name: "Anyloc",
      schemes: ["anyloc-setup", "anyloc"],
    },
  ],
};
