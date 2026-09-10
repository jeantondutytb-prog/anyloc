const fs = require("node:fs");
const path = require("node:path");

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: "io.anyloc.setup",
  productName: "Anyloc",
  artifactName: "Anyloc-Setup.${ext}",
  directories: {
    output: "dist",
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
    identity: "-",
    gatekeeperAssess: false,
  },
  win: {
    target: ["nsis"],
    signAndEditExecutable: false,
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: null,
    uninstallerIcon: null,
  },
  protocols: [
    {
      name: "Anyloc Setup",
      schemes: ["anyloc-setup"],
    },
  ],
};
