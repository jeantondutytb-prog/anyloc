const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const pythonSetup = require("./python-setup");

let cachedCli = null;
let cachedPython = null;

const DEVICE_TOKEN_PREFIX = "anyloc_";

const DEFAULT_API_BASE_URL = "https://www.anyloc.io";
const ALLOWED_API_HOSTS = new Set([
  "anyloc.io",
  "www.anyloc.io",
  "localhost",
  "127.0.0.1",
]);
function normalizeHost(hostname) {
  return String(hostname || "").trim().toLowerCase().replace(/\.$/, "");
}

function isAllowedApiHost(hostname) {
  const host = normalizeHost(hostname);

  if (ALLOWED_API_HOSTS.has(host)) {
    return true;
  }

  return host.endsWith(".vercel.app");
}

function normalizeApiBaseUrl(raw) {
  let url = (raw || DEFAULT_API_BASE_URL).trim();
  url = url.replace(/\/api\/device\/location\/?$/i, "");
  url = url.replace(/\/$/, "");

  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url}`);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return DEFAULT_API_BASE_URL;
    }

    if (!isAllowedApiHost(parsed.hostname)) {
      return DEFAULT_API_BASE_URL;
    }

    return parsed.origin.replace(/\/$/, "");
  } catch {
    return DEFAULT_API_BASE_URL;
  }
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

function getSpawnEnv() {
  const isWin = process.platform === "win32";
  const sep = isWin ? ";" : ":";

  const bundledCli = pythonSetup.getBundledCli();
  const bundledDir = path.dirname(bundledCli);

  const extraPaths = isWin
    ? [
        bundledDir,
        path.join(pythonSetup.getEnvDir()),
        path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python314", "Scripts"),
        path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python313", "Scripts"),
        path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python312", "Scripts"),
        path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python314"),
        path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python313"),
        path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python312"),
        path.join(process.env.APPDATA || "", "Python", "Python314", "Scripts"),
        path.join(process.env.APPDATA || "", "Python", "Python313", "Scripts"),
        path.join(process.env.APPDATA || "", "Python", "Python312", "Scripts"),
        "C:\\Python314\\Scripts",
        "C:\\Python313\\Scripts",
        "C:\\Python312\\Scripts",
        "C:\\Python314",
        "C:\\Python313",
        "C:\\Python312",
      ]
    : [
        bundledDir,
        "/Library/Frameworks/Python.framework/Versions/3.14/bin",
        "/Library/Frameworks/Python.framework/Versions/3.13/bin",
        "/Library/Frameworks/Python.framework/Versions/3.12/bin",
        "/opt/homebrew/bin",
        "/usr/local/bin",
      ];

  const currentPath = process.env.PATH || "";
  const mergedPath = [...extraPaths, currentPath].join(sep);

  return {
    ...process.env,
    PATH: mergedPath,
  };
}

function getCliCandidates() {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const isWin = process.platform === "win32";
  const bundledCli = pythonSetup.getBundledCli();

  if (isWin) {
    const localAppData = process.env.LOCALAPPDATA || "";
    const appData = process.env.APPDATA || "";
    return [
      bundledCli,
      process.env.ANYLOC_PMD3,
      path.join(localAppData, "Programs", "Python", "Python314", "Scripts", "pymobiledevice3.exe"),
      path.join(localAppData, "Programs", "Python", "Python313", "Scripts", "pymobiledevice3.exe"),
      path.join(localAppData, "Programs", "Python", "Python312", "Scripts", "pymobiledevice3.exe"),
      path.join(appData, "Python", "Python314", "Scripts", "pymobiledevice3.exe"),
      path.join(appData, "Python", "Python313", "Scripts", "pymobiledevice3.exe"),
      path.join(appData, "Python", "Python312", "Scripts", "pymobiledevice3.exe"),
      "C:\\Python314\\Scripts\\pymobiledevice3.exe",
      "C:\\Python313\\Scripts\\pymobiledevice3.exe",
      "C:\\Python312\\Scripts\\pymobiledevice3.exe",
      "pymobiledevice3",
    ].filter(Boolean);
  }

  return [
    bundledCli,
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
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const isWin = process.platform === "win32";
  const bundledPython = pythonSetup.getBundledPython();

  if (isWin) {
    const localAppData = process.env.LOCALAPPDATA || "";
    return [
      bundledPython,
      process.env.ANYLOC_PYTHON,
      path.join(localAppData, "Programs", "Python", "Python314", "python.exe"),
      path.join(localAppData, "Programs", "Python", "Python313", "python.exe"),
      path.join(localAppData, "Programs", "Python", "Python312", "python.exe"),
      "C:\\Python314\\python.exe",
      "C:\\Python313\\python.exe",
      "C:\\Python312\\python.exe",
      "python",
      "python3",
    ].filter(Boolean);
  }

  return [
    bundledPython,
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

function runCli(args, timeoutMs = 30000) {
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
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      try { child.kill("SIGTERM"); } catch {}
      resolve({
        ok: false,
        stdout,
        stderr: stderr || "Timeout — la commande a pris trop de temps.",
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (killed) return;
      clearTimeout(timer);
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

// pymobiledevice3 errors are Python exception names / tracebacks. Map the
// ones customers actually hit to an instruction they can follow.
const PMD3_ERROR_HINTS = [
  [
    /DeveloperModeIsNotEnabled|developer mode is not enabled|DeveloperModeError/i,
    "Le mode développeur n'est pas activé. Sur l'iPhone : Réglages → Confidentialité et sécurité → Mode développeur, puis redémarre.",
  ],
  [
    /PasswordRequiredError|device is locked|DeviceLocked/i,
    "L'iPhone est verrouillé. Déverrouille-le et réessaie.",
  ],
  [
    /PairingDialogResponsePending|NotPairedError|UserDeniedPairing|InvalidHostID|PairingError/i,
    "L'iPhone ne fait pas encore confiance à cet ordinateur. Déverrouille-le et appuie sur « Faire confiance », puis réessaie.",
  ],
  [
    /NoDeviceConnected|DeviceNotFound|ConnectionFailedToUsbmuxd|No device/i,
    "Aucun iPhone détecté. Rebranche le câble USB et déverrouille l'iPhone.",
  ],
  [
    /DeveloperDiskImage|MounterError|AlreadyMounted|InvalidServiceError|personalized image/i,
    "L'iPhone n'a pas pu préparer les outils développeur. Débranche, redémarre l'iPhone, rebranche et réessaie (connexion internet requise).",
  ],
  [
    /tunnel|RemoteXPC|StartServiceError/i,
    "Connexion développeur impossible (iOS 17+). Garde Anyloc ouvert, déverrouille l'iPhone et réessaie dans quelques secondes.",
  ],
  [
    /Timeout/i,
    "L'iPhone ne répond pas. Déverrouille-le, vérifie le câble et réessaie.",
  ],
];

function humanizePmd3Error(raw) {
  const text = String(raw || "").trim();

  for (const [pattern, hint] of PMD3_ERROR_HINTS) {
    if (pattern.test(text)) {
      return hint;
    }
  }

  const lastLine = text.split("\n").map((line) => line.trim()).filter(Boolean).pop();
  return lastLine || "Erreur inconnue avec l'iPhone. Rebranche-le et réessaie.";
}

function udidArgs(udid) {
  return udid ? ["--udid", udid] : [];
}

async function getDeveloperModeStatus({ udid } = {}) {
  const result = await runCli(["amfi", "developer-mode-status", ...udidArgs(udid)], 15000);

  if (!result.ok) {
    return {
      ok: false,
      enabled: false,
      message: humanizePmd3Error(result.stderr || result.stdout),
    };
  }

  const enabled = /\btrue\b/i.test(result.stdout);
  return { ok: true, enabled };
}

// On iOS 16+ the "Mode développeur" switch stays hidden in Settings until a
// developer tool asks for it. This makes it appear without installing an app.
async function revealDeveloperMode({ udid } = {}) {
  const status = await getDeveloperModeStatus({ udid });

  if (status.ok && status.enabled) {
    return { ok: true, enabled: true };
  }

  const result = await runCli(["amfi", "reveal-developer-mode", ...udidArgs(udid)], 20000);

  if (!result.ok) {
    return {
      ok: false,
      enabled: false,
      message: humanizePmd3Error(result.stderr || result.stdout),
    };
  }

  return { ok: true, enabled: false };
}

async function detectUsbDevice() {
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
      message: `${deviceName} — iPhone détecté.`,
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

  if (action.type === "clear") {
    args.push("clear");
  } else {
    args.push("set");
  }

  if (mode === "userspace") {
    args.push("--userspace");
  }

  if (udid) {
    args.push("--udid", udid);
  }

  args.push("--");

  if (action.type === "set") {
    args.push(String(action.lat), String(action.lng));
  }

  return args;
}

async function runSimulateLocation(action, udid) {
  const modes = ["userspace", "default"];

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
    message: humanizePmd3Error(lastError),
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
        "Le GPS est en pause. Ouvre l'app Anyloc sur ton iPhone et choisis une destination.",
      location,
      device,
    };
  }

  const { lat, lng, name } = location;

  if (lat == null || lng == null) {
    return {
      ok: false,
      message:
        "Aucune coordonnée GPS active. Ouvre l'app Anyloc et choisis une destination.",
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

function expandHome(filePath) {
  const home = process.env.HOME || "";

  if (filePath.startsWith("~/")) {
    return path.join(home, filePath.slice(2));
  }

  return filePath;
}

function findPairingFileFromStdout(stdout) {
  const output = stdout || "";
  const matches = output.match(/(?:~\/|\/)[^\s'"]+\.plist/g) || [];

  for (const match of matches) {
    const candidate = expandHome(match.replace(/['",]+$/g, ""));

    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolvePairingSourcePath(udid, stdout) {
  if (udid) {
    const home = process.env.HOME || "";
    const candidates = [
      path.join(home, ".pymobiledevice3", "pair_records", `${udid}.plist`),
      path.join(home, ".pymobiledevice3", "remote_pair_records", `${udid}.plist`),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return findPairingFileFromStdout(stdout);
}

async function exportPairingFile({ udid, token, apiBaseUrl }) {
  let resolvedUdid = udid;

  if (!resolvedUdid) {
    const device = await detectUsbDevice();

    if (!device.connected || !device.udid) {
      return {
        ok: false,
        message: "Branche un iPhone en USB pour envoyer le pairing.",
      };
    }

    resolvedUdid = device.udid;
  }

  const normalizedToken = normalizeDeviceToken(token);
  const validationError = validateDeviceToken(normalizedToken);

  if (validationError) {
    return {
      ok: false,
      message: validationError,
    };
  }

  const args = ["remote", "pair", ...(resolvedUdid ? ["--udid", resolvedUdid] : [])];
  const result = await runCli(args);

  if (!result.ok) {
    return {
      ok: false,
      message:
        (result.stderr || result.stdout || "").trim() ||
        "Échec du pairing distant. Vérifie le mode développeur sur l'iPhone.",
    };
  }

  const sourcePath = resolvePairingSourcePath(resolvedUdid, result.stdout);

  if (!sourcePath) {
    return {
      ok: false,
      message:
        "Pairing réussi mais fichier RPPairing introuvable. Consulte la sortie pymobiledevice3.",
    };
  }

  try {
    const pairingBase64 = fs.readFileSync(sourcePath).toString("base64");
    const baseUrl = normalizeApiBaseUrl(apiBaseUrl);
    const response = await fetch(`${baseUrl}/api/device/pairing`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${normalizedToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ pairing: pairingBase64 }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        message:
          payload.error ||
          `Impossible d'envoyer le pairing au serveur (${response.status}).`,
      };
    }

    return {
      ok: true,
      sourcePath,
      udid: resolvedUdid,
      message:
        "Pairing envoyé au serveur. Ouvre Anyloc sur ton iPhone, le pairing sera téléchargé automatiquement.",
    };
  } catch (error) {
    return {
      ok: false,
      message: `Impossible d'envoyer le pairing : ${error.message}`,
    };
  }
}

async function savePairingLocalCopy({ sourcePath, udid }) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return {
      ok: false,
      message: "Aucun fichier de pairing à sauvegarder.",
    };
  }

  try {
    const { app } = require("electron");
    const destPath = path.join(
      app.getPath("documents"),
      `Anyloc-Pairing-${udid || "device"}.plist`
    );

    fs.copyFileSync(sourcePath, destPath);

    return {
      ok: true,
      path: destPath,
      message: "Copie locale enregistrée dans Documents.",
    };
  } catch (error) {
    return {
      ok: false,
      message: `Impossible de sauvegarder la copie locale : ${error.message}`,
    };
  }
}

async function applyGpsDirect({ udid, lat, lng }) {
  if (lat == null || lng == null) {
    return { ok: false, message: "Coordonnées manquantes." };
  }

  const cli = resolvePymobiledevice3Cli();
  if (!cli) {
    return {
      ok: false,
      message: "pymobiledevice3 introuvable. Terminal : pip3 install pymobiledevice3",
    };
  }

  const result = await runSimulateLocation({ type: "set", lat, lng }, udid);

  if (result.ok) {
    return {
      ok: true,
      message: `GPS appliqué : ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    };
  }

  return result;
}

async function clearGpsLocation({ udid }) {
  const cli = resolvePymobiledevice3Cli();
  if (!cli) {
    return {
      ok: false,
      message: "pymobiledevice3 introuvable. Terminal : pip3 install pymobiledevice3",
    };
  }

  return runSimulateLocation({ type: "clear" }, udid);
}

function clearCachedPaths() {
  cachedCli = null;
  cachedPython = null;
}

function getPmd3Invocation() {
  const cli = resolvePymobiledevice3Cli();
  if (cli) {
    return { command: cli, prefix: [] };
  }

  const python = resolvePythonExecutable();
  if (python) {
    return { command: python, prefix: ["-m", "pymobiledevice3"] };
  }

  return null;
}

function missingToolsMessage() {
  return "pymobiledevice3 introuvable. Relance Anyloc — il s'installe automatiquement au premier lancement.";
}

module.exports = {
  detectUsbDevice,
  getDeveloperModeStatus,
  revealDeveloperMode,
  humanizePmd3Error,
  applyGpsLocation,
  applyGpsDirect,
  clearGpsLocation,
  exportPairingFile,
  savePairingLocalCopy,
  resolvePythonExecutable,
  resolvePymobiledevice3Cli,
  getPmd3Invocation,
  missingToolsMessage,
  clearCachedPaths,
  getSpawnEnv,
  getScriptsDir,
};
