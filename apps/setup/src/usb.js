const { spawn } = require("node:child_process");
const path = require("node:path");

const SCRIPTS_DIR = path.join(__dirname, "..", "scripts");

function runPython(scriptName, args = []) {
  return new Promise((resolve) => {
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    const child = spawn("python3", [scriptPath, ...args], {
      cwd: path.join(__dirname, ".."),
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        resolve({
          connected: false,
          udid: null,
          deviceName: null,
          message:
            stderr.trim() ||
            "Impossible d'exécuter le script USB. Installe pymobiledevice3.",
        });
        return;
      }

      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve({
          connected: false,
          udid: null,
          deviceName: null,
          message: "Réponse USB invalide.",
        });
      }
    });
  });
}

async function detectUsbDevice() {
  return runPython("detect_device.py");
}

async function installIosApp({ udid }) {
  const ipaPath = path.join(__dirname, "..", "..", "ios", "dist", "Anyloc.ipa");
  const args = ["--ipa", ipaPath];

  if (udid) {
    args.push("--udid", udid);
  }

  return runPython("install_ios.py", args);
}

module.exports = {
  detectUsbDevice,
  installIosApp,
};
