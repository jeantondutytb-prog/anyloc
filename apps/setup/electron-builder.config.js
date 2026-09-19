const fs = require("node:fs");
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
    description: "Anyloc — installation iPhone via USB",
    author: "Anyloc",
  },
  files: ["src/**/*", "package.json"],
  extraResources: [
    {
      from: "scripts",
      to: "scripts",
      filter: ["**/*"],
    },
    ...(fs.existsSync(path.join(__dirname, "build-resources", "Anyloc.ipa"))
      ? [
          {
            from: "build-resources/Anyloc.ipa",
            to: "Anyloc.ipa",
          },
        ]
      : []),
  ],
  mac: {
    category: "public.app-category.utilities",
    target: ["dmg"],
    identity: null,
    gatekeeperAssess: false,
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
