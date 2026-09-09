const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

let cachedPython = null;

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

function getPythonCandidates() {
  const home = process.env.HOME || "";
  const candidates = [
    process.env.ANYLOC_PYTHON,
    "/Library/Frameworks/Python.framework/Versions/3.14/bin/python3",
    "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
    "/Library/Frameworks/Python.framework/Versions/3.12/bin/python3",
    "/Library/Frameworks/Python.framework/Versions/3.11/bin/python3",
    "/opt/homebrew/bin/python3",
    "/usr/local/bin/python3",
    path.join(home, ".local", "bin", "python3"),
    "python3",
  ].filter(Boolean);

  return [...new Set(candidates)];
}

function getSpawnEnv() {
  const extraPaths = [
    "/Library/Frameworks/Python.framework/Versions/3.14/bin",
    "/Library/Frameworks/Python.framework/Versions/3.13/bin",
    "/Library/Frameworks/Python.framework/Versions/3.12/bin",
    "/opt/homebrew/bin",
    "/usr/local/bin",
  ];

  const currentPath = process.env.PATH || "";
  const mergedPath = [...extraPaths, currentPath].join(":");

  return {
    ...process.env,
    PATH: mergedPath,
  };
}

function resolvePythonExecutable() {
  if (cachedPython) {
    return cachedPython;
  }

  const env = getSpawnEnv();

  for (const python of getPythonCandidates()) {
    const result = spawnSync(
      python,
      ["-c", "from pymobiledevice3.usbmux import list_devices"],
      {
        env,
        timeout: 8000,
      }
    );

    if (result.status === 0) {
      cachedPython = python;
      return python;
    }
  }

  return null;
}

function runPython(scriptName, args = []) {
  return new Promise((resolve) => {
    const python = resolvePythonExecutable();

    if (!python) {
      resolve({
        connected: false,
        ok: false,
        udid: null,
        deviceName: null,
        message:
          "Python avec pymobiledevice3 introuvable. Dans Terminal : pip3 install pymobiledevice3 — puis relance Anyloc Setup avec : PATH=\"/Library/Frameworks/Python.framework/Versions/3.14/bin:$PATH\" open -a \"Anyloc Setup\"",
      });
      return;
    }

    const scriptPath = path.join(getScriptsDir(), scriptName);
    const child = spawn(python, [scriptPath, ...args], {
      cwd: getScriptsDir(),
      env: getSpawnEnv(),
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
            "Impossible d'exécuter le script USB. Vérifie que pymobiledevice3 est installé.",
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
