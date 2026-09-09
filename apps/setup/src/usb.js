const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

let cachedCli = null;
let cachedPython = null;

const DEVICE_TOKEN_PREFIX = "anyloc_";

const DEFAULT_API_BASE_URL = "https://www.anyloc.io";

function normalizeApiBaseUrl(raw) {
  let url = (raw || DEFAULT_API_BASE_URL).trim();
  url = url.replace(/\/api\/device\/location\/?$/i, "");
  url = url.replace(/\/$/, "");
  // anyloc.io redirects to www and strips Authorization headers on redirect.
  url = url.replace(/^https?:\/\/anyloc\.io$/i, DEFAULT_API_BASE_URL);
  return url || DEFAULT_API_BASE_URL;
}

function normalizeDeviceToken(raw) {
  if (!raw) {
    return "";
  }

  let token = String(raw).trim();
  token = token.replace(/^\uFEFF/, "").replace(/[\u200B-\u200D\uFEFF]/g, "");

  if (/^bearer\s+/i.test(token)) {
    token = token.replace(/^bearer\s+/i, "").trim();
  }

  return token.replace(/^["'`]+|["'`]+$/g, "").trim();
}

function validateDeviceToken(token) {
  if (!token) {
    return "Colle ton code de liaison depuis anyloc.io/dashboard/installation.";
  }

  if (!token.startsWith(DEVICE_TOKEN_PREFIX)) {
    return (
      "Code invalide : il doit commencer par anyloc_. " +
      "Va sur le dashboard → Installation → Générer mon code de liaison, puis copie-le en entier."
    );
  }

  if (token.length < 20) {
    return "Code incomplet. Copie le code en entier depuis le dashboard.";
  }

  return null;
}

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

function getCliCandidates() {
  const home = process.env.HOME || "";

  return [
    process.env.ANYLOC_PMD3,
    "/Library/Frameworks/Python.framework/Versions/3.14/bin/pymobiledevice3",
    "/Library/Frameworks/Python.framework/Versions/3.13/bin/pymobiledevice3",
    "/Library/Frameworks/Python.framework/Versions/3.12/bin/pymobiledevice3",
    "/opt/homebrew/bin/pymobiledevice3",
    "/usr/local/bin/pymobiledevice3",
    path.join(home, ".local", "bin", "pymobiledevice3"),
    "pymobiledevice3",
  ].filter(Boolean);
}

function resolvePymobiledevice3Cli() {
  if (cachedCli) {
    return cachedCli;
  }

  const env = getSpawnEnv();

  for (const cli of getCliCandidates()) {
    const result = spawnSync(cli, ["usbmux", "list"], {
      env,
      timeout: 8000,
    });

    if (result.status === 0) {
      cachedCli = cli;
      return cli;
    }
  }

  return null;
}

function getPythonCandidates() {
  const home = process.env.HOME || "";

  return [
    process.env.ANYLOC_PYTHON,
    "/Library/Frameworks/Python.framework/Versions/3.14/bin/python3",
    "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
    "/Library/Frameworks/Python.framework/Versions/3.12/bin/python3",
    "/opt/homebrew/bin/python3",
    "/usr/local/bin/python3",
    path.join(home, ".local", "bin", "python3"),
    "python3",
  ].filter(Boolean);
}

function resolvePythonExecutable() {
  if (cachedPython) {
    return cachedPython;
  }

  const env = getSpawnEnv();

  for (const python of getPythonCandidates()) {
    const result = spawnSync(
      python,
      ["-c", "import pymobiledevice3"],
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

function runCli(args) {
  return new Promise((resolve) => {
    const cli = resolvePymobiledevice3Cli();

    if (!cli) {
      resolve({
        ok: false,
        stdout: "",
        stderr:
          "pymobiledevice3 introuvable. Terminal : pip3 install pymobiledevice3",
      });
      return;
    }

    const child = spawn(cli, args, {
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
      resolve({
        ok: code === 0,
        stdout,
        stderr,
      });
    });
  });
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
          "Python avec pymobiledevice3 introuvable. Terminal : pip3 install pymobiledevice3",
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
      const trimmedStdout = stdout.trim();

      if (trimmedStdout) {
        try {
          const parsed = JSON.parse(trimmedStdout);

          if (parsed && typeof parsed === "object") {
            resolve(parsed);
            return;
          }
        } catch {
          // fall through to generic handling
        }
      }

      if (code !== 0) {
        resolve({
          connected: false,
          ok: false,
          udid: null,
          deviceName: null,
          message:
            stderr.trim() ||
            trimmedStdout ||
            "Impossible d'exécuter le script USB. Vérifie que pymobiledevice3 est installé.",
        });
        return;
      }

      resolve({
        connected: false,
        ok: false,
        udid: null,
        deviceName: null,
        message: "Réponse USB invalide.",
      });
    });
  });
}

function getInstallAvailability() {
  const ipaPath = getIpaPath();

  if (fs.existsSync(ipaPath)) {
    return {
      installReady: true,
      installHint: null,
    };
  }

  return {
    installReady: false,
    installHint:
      "L'app iOS native n'est pas encore disponible. Utilise « Appliquer la position GPS » dans Anyloc Setup pour simuler ta position via USB.",
  };
}

async function detectUsbDevice() {
  const installAvailability = getInstallAvailability();
  const result = await runCli(["usbmux", "list"]);

  if (!result.ok) {
    return {
      connected: false,
      udid: null,
      deviceName: null,
      message:
        result.stderr.trim() ||
        "Impossible de lister les appareils USB. Vérifie pymobiledevice3.",
    };
  }

  try {
    const devices = JSON.parse(result.stdout || "[]");

    if (!devices.length) {
      return {
        connected: false,
        udid: null,
        deviceName: null,
        message:
          "Aucun iPhone en USB. Déverrouille l'iPhone, branche-le, ouvre le Finder pour « Faire confiance », puis Revérifier.",
      };
    }

    const device = devices[0];
    const udid = device.UniqueDeviceID || device.Identifier;
    const deviceName = device.DeviceName || `iPhone (${String(udid).slice(0, 8)}…)`;

    return {
      connected: true,
      udid,
      deviceName,
      message: `${deviceName} — iPhone détecté, prêt pour l'installation.`,
      installReady: installAvailability.installReady,
      installHint: installAvailability.installHint,
    };
  } catch {
    return {
      connected: false,
      udid: null,
      deviceName: null,
      message: "Réponse USB invalide depuis pymobiledevice3.",
    };
  }
}

async function fetchDashboardLocation({ token, apiBaseUrl }) {
  const normalizedToken = normalizeDeviceToken(token);
  const validationError = validateDeviceToken(normalizedToken);

  if (validationError) {
    return {
      ok: false,
      message: validationError,
    };
  }

  const baseUrl = normalizeApiBaseUrl(apiBaseUrl);
  const url = `${baseUrl}/api/device/location`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${normalizedToken}`,
        Accept: "application/json",
      },
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const apiError = payload.error;

      if (apiError === "Authorization Bearer token requis.") {
        return {
          ok: false,
          message:
            "Code de liaison refusé par l'API. Regénère un nouveau code sur anyloc.io/dashboard/installation et colle uniquement la partie anyloc_...",
        };
      }

      return {
        ok: false,
        message:
          apiError ||
          `Erreur API Anyloc (${response.status}). Vérifie ton token et ton abonnement.`,
      };
    }

    return {
      ok: true,
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      message: `Impossible de joindre l'API Anyloc : ${error.message}`,
    };
  }
}

function buildSimulateLocationArgs(action, udid, mode) {
  const args = ["developer", "dvt", "simulate-location"];

  if (mode === "native") {
    args.push("--native");
  } else {
    args.push("--userspace");
  }

  if (udid) {
    args.push("--udid", udid);
  }

  if (action.type === "clear") {
    args.push("clear", "--");
    return args;
  }

  args.push("set", "--", String(action.lat), String(action.lng));
  return args;
}

async function runSimulateLocation(action, udid) {
  const modes =
    process.platform === "darwin" ? ["native", "userspace"] : ["userspace"];

  let lastError = "Impossible d'appliquer la position GPS sur l'iPhone.";

  for (const mode of modes) {
    const args = buildSimulateLocationArgs(action, udid, mode);
    const result = await runCli(args);

    if (result.ok) {
      return { ok: true };
    }

    lastError = (result.stderr || result.stdout || lastError).trim();
  }

  return {
    ok: false,
    message: lastError,
  };
}

async function applyGpsLocation({ udid, token, apiBaseUrl }) {
  const normalizedToken = normalizeDeviceToken(token);
  const validationError = validateDeviceToken(normalizedToken);

  if (validationError) {
    return {
      ok: false,
      message: validationError,
    };
  }

  const cli = resolvePymobiledevice3Cli();

  if (!cli) {
    return {
      ok: false,
      message:
        "pymobiledevice3 introuvable. Terminal : pip3 install pymobiledevice3 puis relance Anyloc Setup avec :\nPATH=\"/Library/Frameworks/Python.framework/Versions/3.14/bin:$PATH\" open -a \"Anyloc Setup\"",
    };
  }

  const locationResult = await fetchDashboardLocation({
    token: normalizedToken,
    apiBaseUrl,
  });

  if (!locationResult.ok) {
    return locationResult;
  }

  const { location, device } = locationResult.payload;

  if (!location?.isActive) {
    const cleared = await runSimulateLocation({ type: "clear" }, udid);

    if (!cleared.ok) {
      return cleared;
    }

    return {
      ok: true,
      action: "cleared",
      message:
        "Le GPS du dashboard est désactivé. Active Marbella sur la carte puis réessaie.",
      location,
      device,
    };
  }

  const { lat, lng, name } = location;

  if (lat == null || lng == null) {
    return {
      ok: false,
      message:
        "Aucune coordonnée GPS active. Va sur le dashboard, choisis Marbella et active le signal GPS.",
    };
  }

  const applied = await runSimulateLocation({ type: "set", lat, lng }, udid);

  if (!applied.ok) {
    return applied;
  }

  const locationName = name || "Position choisie";

  return {
    ok: true,
    action: "set",
    message: `GPS appliqué : ${locationName} (${lat}, ${lng})`,
    location,
    device,
  };
}

async function installIosApp({ udid }) {
  const ipaPath = getIpaPath();

  if (!fs.existsSync(ipaPath)) {
    return {
      ok: false,
      message:
        "L'app iOS native n'est pas encore disponible. Utilise « Appliquer la position GPS » dans Anyloc Setup pour simuler ta position via USB.",
    };
  }

  const args = ["apps", "install", ipaPath];

  if (udid) {
    args.push("--udid", udid);
  }

  const result = await runCli(args);

  if (result.ok) {
    return {
      ok: true,
      message: "Anyloc installé sur ton iPhone. Ouvre l'app et colle ton token.",
      udid,
      output: result.stdout.trim(),
    };
  }

  return {
    ok: false,
    message:
      (result.stderr || result.stdout || "").trim() ||
      "Échec de l'installation. Vérifie le mode développeur et la confiance USB.",
    udid,
  };
}

module.exports = {
  detectUsbDevice,
  installIosApp,
  applyGpsLocation,
};
