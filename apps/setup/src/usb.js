const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
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

  const packaged = pythonSetup.getPackagedPython();
  if (packaged) extraPaths.unshift(path.dirname(packaged));

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

  // Shipped with the app: always run as `python -m pymobiledevice3` (see
  // getPmd3Invocation), its console-script launchers are not shipped.
  if (pythonSetup.getPackagedPython()) {
    cachedCli = pythonSetup.getPackagedPython();
    return cachedCli;
  }

  // Our own install is trusted as is: probing it can outlast the timeout on a
  // slow PC (pymobiledevice3 10.x is heavy to import) and read as "missing".
  if (pythonSetup.isBundleReady()) {
    cachedCli = pythonSetup.getBundledCli();
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

  if (pythonSetup.isBundleReady()) {
    cachedPython = pythonSetup.getBundledPython();
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
    const invocation = getPmd3Invocation();

    if (!invocation) {
      resolve({
        ok: false,
        stdout: "",
        stderr:
          missingToolsMessage(),
      });
      return;
    }

    const child = spawn(invocation.command, [...invocation.prefix, ...args], {
      env: getSpawnEnv(),
      windowsHide: true,
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
          missingToolsMessage(),
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
    /AnylocNoDevice/,
    "iPhone introuvable. Branche-le en USB, ou mets-le sur le même Wi-Fi que cet ordinateur et déverrouille-le.",
  ],
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
    /AnylocDdiFailed/,
    "Anyloc n'a pas pu préparer ton iPhone. Vérifie que l'ordinateur a internet, garde l'iPhone branché et déverrouillé, puis réessaie.",
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
    /ApplicationVerificationFailed|DeviceNotProvisioned|provisioning profile|0xe8008012/i,
    "Ton app n'est pas encore prête pour cet iPhone. Attends une minute et réessaie.",
  ],
  [
    /NotEnoughDiskSpace|insufficient space|disk space/i,
    "Plus assez de place sur l'iPhone. Libère un peu d'espace et réessaie.",
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

  // Raw Python errors mean nothing to customers: log them, show a next step.
  if (text) console.warn("[pmd3]", text.split("\n").slice(-5).join("\n"));
  return "L'iPhone n'a pas répondu comme prévu. Débranche-le, rebranche-le, déverrouille-le et réessaie.";
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
      message: humanizePmd3Error(result.stderr || result.stdout),
      error: (result.stderr || result.stdout).trim().split("\n").slice(-3).join("\n"),
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
          "Aucun iPhone en USB. Branche l'iPhone, déverrouille-le et appuie sur « Faire confiance » sur l'iPhone.",
      };
    }

    // Setup steps (app install, trust) need the cable: prefer the USB entry.
    const device = devices.find((d) => d.ConnectionType === "USB") || devices[0];
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
        missingToolsMessage(),
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
      path.join(home, ".pymobiledevice3", `remote_${udid}.plist`),
      path.join(home, ".pymobiledevice3", "remote_pair_records", `${udid}.plist`),
      path.join(home, ".pymobiledevice3", "pair_records", `${udid}.plist`),
      path.join(home, ".pymobiledevice3", `${udid}.plist`),
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
    let pairingBase64;
    if (hasWifiPairing(resolvedUdid)) {
      pairingBase64 = Buffer.from(appRemotePairingPlist(resolvedUdid)).toString("base64");
    } else {
      pairingBase64 = fs.readFileSync(sourcePath).toString("base64");
    }
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
      message: missingToolsMessage(),
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

// Goes through live_location.py so it reaches the iPhone over Wi-Fi too.
function clearGpsLocation({ udid }) {
  return new Promise((resolve) => {
    const python = resolvePythonExecutable();
    if (!python) {
      resolve({ ok: false, message: missingToolsMessage() });
      return;
    }

    const child = spawn(
      python,
      [path.join(getScriptsDir(), "live_location.py"), "clear", ...udidArgs(udid)],
      { cwd: getScriptsDir(), env: getSpawnEnv(), windowsHide: true }
    );

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => resolve({ ok: false, message: error.message }));
    child.on("close", (code) => {
      resolve(code === 0 ? { ok: true } : { ok: false, message: humanizePmd3Error(stderr) });
    });
  });
}

// RemotePairing records live next to pymobiledevice3's other pair records.
function remotePairRecordPath(udid) {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return path.join(home, ".pymobiledevice3", `remote_${udid}.plist`);
}

function hasWifiPairing(udid) {
  if (udid) {
    return fs.existsSync(remotePairRecordPath(udid));
  }

  try {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    return fs
      .readdirSync(path.join(home, ".pymobiledevice3"))
      .some((name) => name.startsWith("remote_") && name.endsWith(".plist"));
  } catch {
    return false;
  }
}

// Writes the RemotePairing record that lets live_location.py reach the iPhone
// over Wi-Fi once unplugged. Runs over the already-trusted USB lockdown, so the
// iPhone shows no prompt. Needs iOS 17+.
async function ensureWifiPairing({ udid }) {
  if (!udid) {
    return { ok: false, message: "UDID manquant." };
  }

  if (hasWifiPairing(udid)) {
    return { ok: true };
  }

  const result = await runCli(["lockdown", "remotepairing", "--pair", "--udid", udid], 30000);

  if (!result.ok || !hasWifiPairing(udid)) {
    return {
      ok: false,
      message: humanizePmd3Error(result.stderr || result.stdout),
    };
  }

  return { ok: true };
}

// pymobiledevice3 names this host to the iPhone with uuid3(DNS, hostname) when
// it creates the RemotePairing record, and does not store it in the record.
function remotePairingHostId() {
  const ns = Buffer.from("6ba7b8109dad11d180b400c04fd430c8", "hex");
  const hash = require("node:crypto")
    .createHash("md5")
    .update(Buffer.concat([ns, Buffer.from(os.hostname(), "utf8")]))
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x30;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)]
    .join("-")
    .toUpperCase();
}

// Rewrites pymobiledevice3's RemotePairing record (remote_<udid>.plist) in the
// format the iPhone app's idevice library reads: same Ed25519 keys, plus the
// host identifier the iPhone knows this pairing under.
function appRemotePairingPlist(udid) {
  const xml = fs.readFileSync(remotePairRecordPath(udid), "utf8");
  const dataFor = (key) => {
    const match = xml.match(new RegExp(`<key>${key}</key>\\s*<data>([^<]*)</data>`));
    return match ? match[1].replace(/\s+/g, "") : null;
  };
  const publicKey = dataFor("public_key");
  const privateKey = dataFor("private_key");
  if (!publicKey || !privateKey) {
    throw new Error("Pairing Wi-Fi incomplet. Rebranche l'iPhone et réessaie.");
  }
  const hostId = xml.match(/<key>host_identifier<\/key>\s*<string>([^<]*)<\/string>/)?.[1] || remotePairingHostId();
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    `\t<key>identifier</key>\n\t<string>${hostId}</string>`,
    `\t<key>private_key</key>\n\t<data>${privateKey}</data>`,
    `\t<key>public_key</key>\n\t<data>${publicKey}</data>`,
    "</dict>",
    "</plist>",
    "",
  ].join("\n");
}

// Drops a RemotePairing record straight into the Anyloc iPhone app's
// Documents, so the app can drive its own location through LocalDevVPN with no
// computer. iOS 26.4+ drops lockdown TLS sessions over LocalDevVPN, so the app
// opens a RemotePairing tunnel instead of using the lockdown pair record. Goes
// over USB only (never through our server): the record grants full developer
// access to the iPhone. Fails quietly until the app is installed.
async function pushPairingToApp({ udid }) {
  if (!udid) {
    return { ok: false, message: "UDID manquant." };
  }

  // Without this (Xcode's "Connect via network"), the iPhone ignores every
  // network session, LocalDevVPN included.
  const wifi = await runCli(["lockdown", "wifi-connections", "--state", "on", "--udid", udid], 20000);
  if (!wifi.ok) {
    return { ok: false, message: humanizePmd3Error(wifi.stderr || wifi.stdout) };
  }

  const paired = await ensureWifiPairing({ udid });
  if (!paired.ok) {
    return paired;
  }

  const tmp = path.join(os.tmpdir(), `anyloc-rppair-${udid}.plist`);
  try {
    fs.writeFileSync(tmp, appRemotePairingPlist(udid), { mode: 0o600 });
    const pushed = await runCli(
      ["apps", "push", "io.anyloc.app", tmp, "/Documents/AnylocRemotePairing.plist", "--udid", udid],
      20000
    );
    return pushed.ok
      ? { ok: true }
      : { ok: false, message: humanizePmd3Error(pushed.stderr || pushed.stdout) };
  } catch (error) {
    return { ok: false, message: error.message };
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

// Installs the ad hoc-signed Anyloc IPA (built for this iPhone's UDID) over USB.
async function installIphoneApp({ udid, ipaPath }) {
  if (!udid) {
    return { ok: false, message: "Branche ton iPhone en USB." };
  }
  const result = await runCli(["apps", "install", ipaPath, "--udid", udid], 240000);
  return result.ok
    ? { ok: true }
    : { ok: false, message: humanizePmd3Error(result.stderr || result.stdout) };
}

// Asks the iPhone to trust this computer (the "Faire confiance" prompt) and
// waits up to `waitSeconds` for the customer. Resolves to
// { trusted, reason: "pending" | "locked" | "denied" | "error" }.
function trustDevice({ udid, waitSeconds = 45 }) {
  return new Promise((resolve) => {
    const python = resolvePythonExecutable();
    if (!python) {
      resolve({ trusted: false, reason: "error", error: missingToolsMessage() });
      return;
    }

    const child = spawn(
      python,
      [path.join(getScriptsDir(), "trust_device.py"), "--wait", String(waitSeconds), ...udidArgs(udid)],
      { cwd: getScriptsDir(), env: getSpawnEnv(), windowsHide: true }
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      try { child.kill(); } catch {}
    }, (waitSeconds + 30) * 1000);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ trusted: false, reason: "error", error: error.message });
    });
    child.on("close", () => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(stdout.trim().split("\n").pop()));
      } catch {
        resolve({ trusted: false, reason: "error", error: stderr.trim().split("\n").slice(-3).join("\n") });
      }
    });
  });
}

function clearCachedPaths() {
  cachedCli = null;
  cachedPython = null;
}

function getPmd3Invocation() {
  const packaged = pythonSetup.getPackagedPython();
  if (packaged) {
    return { command: packaged, prefix: ["-m", "pymobiledevice3"] };
  }

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
  return "Anyloc n'est pas encore prêt sur cet ordinateur. Ferme Anyloc complètement et rouvre-le.";
}

module.exports = {
  detectUsbDevice,
  getDeveloperModeStatus,
  revealDeveloperMode,
  humanizePmd3Error,
  applyGpsLocation,
  applyGpsDirect,
  clearGpsLocation,
  hasWifiPairing,
  ensureWifiPairing,
  pushPairingToApp,
  installIphoneApp,
  trustDevice,
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
