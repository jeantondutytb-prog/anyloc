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
  },
  protocols: [
    {
      name: "Anyloc",
      schemes: ["anyloc-setup", "anyloc"],
    },
  ],
};
