const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function getScriptsDir() {
  try {
    const { app } = require("electron");

    if (app.isPackaged) {
      return path.join(process.resourcesPath, "scripts");
    }
  } catch {
    // electron not loaded yet — fall back to dev path
  }

  return path.join(__dirname, "..", "scripts");
}

function getIpaPath() {
  try {
    const { app } = require("electron");

    if (app.isPackaged) {
      const bundled = path.join(process.resourcesPath, "Anyloc.ipa");
      if (fs.existsSync(bundled)) {
        return bundled;
      }

      const cached = path.join(app.getPath("userData"), "Anyloc.ipa");
      if (fs.existsSync(cached)) {
        return cached;
      }
    }
  } catch {
    // fall through to dev path
  }

  return path.join(__dirname, "..", "..", "ios", "dist", "Anyloc.ipa");
}

function runPython(scriptName, args = []) {
  return new Promise((resolve) => {
    const scriptPath = path.join(getScriptsDir(), scriptName);
    const child = spawn("python3", [scriptPath, ...args], {
      cwd: getScriptsDir(),
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
          ok: false,
          udid: null,
          deviceName: null,
          message:
            stderr.trim() ||
            "Impossible d'exécuter le script USB. Installe pymobiledevice3 : pip install pymobiledevice3",
        });
        return;
      }

      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve({
          connected: false,
          ok: false,
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
  const ipaPath = getIpaPath();
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
