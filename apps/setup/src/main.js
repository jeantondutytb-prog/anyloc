const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require("electron");
const { spawn: spawnChild } = require("node:child_process");
const path = require("path");
const {
  detectUsbDevice,
  getDeveloperModeStatus,
  revealDeveloperMode,
  applyGpsLocation,
  exportPairingFile,
  savePairingLocalCopy,
  applyGpsDirect,
  clearGpsLocation,
  hasWifiPairing,
  ensureWifiPairing,
  pushPairingToApp,
  resolvePythonExecutable,
  resolvePymobiledevice3Cli,
  missingToolsMessage,
  humanizePmd3Error,
  getSpawnEnv,
  getScriptsDir,
} = require("./usb");
const { ensurePymobiledevice3, isBundleReady, isBundleCurrent } = require("./python-setup");

const SUPABASE_URL =
  process.env.ANYLOC_SUPABASE_URL || "https://gqkxnktprctdvpwvnqli.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.ANYLOC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxa3hua3RwcmN0ZHZwd3ZucWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODUxMTgsImV4cCI6MjEwNDM2MTExOH0.7kOHGgU1s1EDr0luSvDxvcGj3pyOt-8_79dX4sg8kXA";

let pendingLaunchConfig = null;
let mainWindowRef = null;
let spoofProcess = null;
let tray = null;

// ── Auto-sync: poll Supabase and apply GPS in a loop ──
const fs = require("node:fs");
let autoSyncInterval = null;
let autoSyncSession = null;
let lastSyncedLoc = null;
let autoSyncSpoofChild = null;
let reapplyInterval = null;

function getSessionFilePath() {
  try {
    return path.join(app.getPath("userData"), "session.json");
  } catch {
    return path.join(__dirname, "..", "session.json");
  }
}

function saveSessionFile(session) {
  try {
    const p = getSessionFilePath();
    const fd = fs.openSync(p, "w", 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(session)); } finally { fs.closeSync(fd); }
  } catch {}
}

function loadSessionFile() {
  try {
    const data = fs.readFileSync(getSessionFilePath(), "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function clearSessionFile() {
  try { fs.unlinkSync(getSessionFilePath()); } catch {}
}

// Auto-sync keeps one live_location.py stream open and writes each new
// location to its stdin, so a change lands in well under a second instead of
// paying for Python start-up, the Wi-Fi lookup and a new tunnel every time.
// Not `simulate-location set`: it blocks its asyncio loop in wait_return(),
// which starves the userspace tunnel, so the iPhone snaps back to its real
// position after a few seconds (and at once on Windows, where it reads stdin).
//
// spoofTarget is the location last written; it is reported "applied" once the
// stream has caught up with every line written so far. `reported` keeps the
// 5 s re-apply loop from toasting the same error over and over.
let spoofTarget = null;

function spawnSpoofChild() {
  const python = resolvePythonExecutable();
  if (!python) return null;

  const child = spawnChild(
    python,
    [path.join(getScriptsDir(), "live_location.py"), "stream"],
    { env: getSpawnEnv(), stdio: ["pipe", "pipe", "pipe"], windowsHide: true }
  );
  child.stdin.on("error", () => {});

  let pending = 0;
  let stderr = "";
  child.writeLine = (line) => {
    if (line !== "clear") pending += 1;
    child.stdin.write(`${line}\n`);
  };

  child.stdout.on("data", (chunk) => {
    const applied = chunk.toString().split("\n").filter((line) => line.trim() === "applied").length;
    if (!applied) return;
    pending = Math.max(0, pending - applied);
    const target = spoofTarget;
    if (pending || !target || target.child !== child || target.applied) return;
    target.applied = true;
    target.reported.error = false;
    if (!target.reported.applied) {
      target.reported.applied = true;
      const { loc } = target;
      sendSyncStatus(`GPS: ${loc.name || `${loc.lat}, ${loc.lng}`}`, false, loc, { applied: true });
    }
  });
  child.stderr.on("data", (chunk) => {
    const msg = chunk.toString().trim();
    stderr += `${msg}\n`;
    if (msg && !msg.includes("WARNING")) console.log("[Spoof]", msg);
  });
  child.on("close", () => {
    if (autoSyncSpoofChild === child) autoSyncSpoofChild = null;
    // Killed on purpose (live mode, stop), already applied (the re-apply loop
    // reconnects quietly) or never asked for a location: only a location that
    // never landed is an error.
    const target = spoofTarget;
    if (child.killed || !target || target.child !== child || target.applied || target.reported.error) return;
    target.reported.error = true;
    target.reported.applied = false;
    sendSyncStatus(humanizePmd3Error(stderr), true, target.loc);
  });

  autoSyncSpoofChild = child;
  return child;
}

// Opens the stream ahead of the first location so even that one is instant.
// Failures stay quiet here: they are reported once a location is asked for.
function prewarmSpoofChild() {
  if (!autoSyncSpoofChild && !liveActive && !toolsUpgrade) spawnSpoofChild();
}

function applySpoofOnce(loc, reported) {
  const child = autoSyncSpoofChild || spawnSpoofChild();
  if (!child) {
    if (!reported.error) {
      reported.error = true;
      sendSyncStatus(missingToolsMessage(), true, loc);
    }
    return false;
  }

  spoofTarget = { loc, reported, child, applied: false };
  child.writeLine(`${loc.lat} ${loc.lng}`);
  return true;
}

// Clears through the open stream when there is one, keeping it for the next
// location; otherwise a one-off live_location.py clear.
function clearSpoof() {
  if (reapplyInterval) {
    clearInterval(reapplyInterval);
    reapplyInterval = null;
  }
  spoofTarget = null;
  if (autoSyncSpoofChild) {
    autoSyncSpoofChild.writeLine("clear");
    return;
  }
  clearGpsLocation({}).catch(() => {});
}

function killSpoofProcess() {
  if (autoSyncSpoofChild) {
    try { autoSyncSpoofChild.kill("SIGTERM"); } catch {}
    autoSyncSpoofChild = null;
  }
  if (reapplyInterval) {
    clearInterval(reapplyInterval);
    reapplyInterval = null;
  }
}

function sendSyncStatus(message, error, location, extra = {}) {
  if (mainWindowRef) {
    mainWindowRef.webContents.send("autosync:status", {
      active: true,
      message,
      error: !!error,
      location,
      ...extra,
    });
  }
}

function startReapplyLoop(loc) {
  if (reapplyInterval) clearInterval(reapplyInterval);

  const reported = { applied: false, error: false };
  applySpoofOnce(loc, reported);

  reapplyInterval = setInterval(() => {
    if (!autoSyncSpoofChild) {
      applySpoofOnce(loc, reported);
      console.log("[AutoSync] Re-applied GPS (process died)");
    }
  }, 5000);
}

function startAutoSync(session) {
  stopAutoSync();
  if (!session?.access_token || !session?.user?.id) return;
  autoSyncSession = session;
  saveSessionFile(session);
  console.log("[AutoSync] Started — polling every 1s, re-apply every 5s");
  prewarmSpoofChild();

  autoSyncInterval = setInterval(async () => {
    // Walking or playing a route from this computer drives the GPS directly.
    // During a tools upgrade pip is replacing the files the spoof runs from.
    if (liveActive || toolsUpgrade) return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/location_settings?user_id=eq.${autoSyncSession.user.id}&select=name,lat,lng,is_active,updated_at`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${autoSyncSession.access_token}`,
          },
        }
      );
      if (!res.ok) return;
      const rows = await res.json();
      if (!rows.length) return;

      const loc = rows[0];

      // Check if location changed
      const changed =
        !lastSyncedLoc ||
        lastSyncedLoc.lat !== loc.lat ||
        lastSyncedLoc.lng !== loc.lng ||
        lastSyncedLoc.is_active !== loc.is_active ||
        // Choosing the same place again must re-apply it and report back.
        lastSyncedLoc.updated_at !== loc.updated_at;

      if (!changed) return;
      lastSyncedLoc = loc;

      if (!loc.is_active) {
        clearSpoof();
        console.log("[AutoSync] GPS cleared");
        sendSyncStatus("GPS réinitialisé", false, loc);
        return;
      }

      // New location — start re-apply loop
      const name = loc.name || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
      console.log(`[AutoSync] GPS → ${name} (${loc.lat}, ${loc.lng})`);
      sendSyncStatus(`GPS: ${name}`, false, loc);
      startReapplyLoop(loc);
    } catch (err) {
      console.error("[AutoSync] Error:", err.message);
    }
  }, 1000);
}

function stopAutoSync() {
  stopLive();
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    lastSyncedLoc = null;
    killSpoofProcess();
    console.log("[AutoSync] Stopped");
  }
}

// ── Live control (walk / route playback) ──
// While the user walks or plays a route from this computer, the location is
// driven straight over USB and auto-sync stops applying Supabase updates.
// Walking keeps one live_location.py process open (a single DVT session) and
// feeds it "lat lng" lines; respawning `simulate-location set` per step made
// the position jump every ~2 s. Routes are replayed with `simulate-location play`.
let liveActive = false;
let liveChild = null;
let liveStream = null;

function killLiveChild() {
  if (liveChild) {
    try { liveChild.kill("SIGTERM"); } catch {}
    liveChild = null;
  }
  liveStream = null;
}

function logLiveOutput(chunk) {
  const msg = chunk.toString().trim();
  if (msg && !msg.includes("WARNING")) console.log("[Live]", msg);
}

function ensureLiveStream() {
  if (liveStream) return liveStream;
  const python = resolvePythonExecutable();
  if (!python) return null;
  killLiveChild();

  const child = spawnChild(
    python,
    [path.join(getScriptsDir(), "live_location.py"), "stream"],
    { env: getSpawnEnv(), stdio: ["pipe", "pipe", "pipe"], windowsHide: true }
  );
  liveChild = child;
  liveStream = child;
  child.on("close", () => {
    if (liveChild === child) liveChild = null;
    if (liveStream === child) liveStream = null;
  });
  child.stdin.on("error", () => {});
  child.stderr.on("data", logLiveOutput);
  return child;
}

// Routes go through live_location.py too: pymobiledevice3's `simulate-location
// play` blocks its loop once the route ends, so the iPhone dropped the last point.
function spawnLive(liveArgs) {
  const python = resolvePythonExecutable();
  if (!python) return false;
  killLiveChild();

  const child = spawnChild(
    python,
    [path.join(getScriptsDir(), "live_location.py"), ...liveArgs],
    { env: getSpawnEnv(), stdio: ["pipe", "pipe", "pipe"], windowsHide: true }
  );
  child.stdin.on("error", () => {});
  liveChild = child;
  child.on("close", () => {
    if (liveChild === child) liveChild = null;
  });
  child.stderr.on("data", logLiveOutput);
  return true;
}

function enterLive() {
  liveActive = true;
  killSpoofProcess();
}

function liveMove(lat, lng) {
  enterLive();
  const stream = ensureLiveStream();
  if (!stream) return { ok: false, message: missingToolsMessage() };
  stream.stdin.write(`${lat} ${lng}\n`);
  return { ok: true };
}

function playRoute(gpx) {
  if (!resolvePythonExecutable()) return { ok: false, message: missingToolsMessage() };
  enterLive();
  const file = path.join(app.getPath("temp"), "anyloc-route.gpx");
  fs.writeFileSync(file, gpx, "utf8");
  spawnLive(["play", file]);
  return { ok: true };
}

function stopLive() {
  if (!liveActive) return;
  liveActive = false;
  killLiveChild();
  // Re-apply whatever Supabase holds on the next auto-sync poll.
  lastSyncedLoc = null;
}

// Installs from older app versions keep an outdated pymobiledevice3 (GPS never
// held on 4.14.16). Upgrade it in the background at launch; auto-sync waits.
let toolsUpgrade = null;

function upgradeToolsIfOutdated() {
  if (toolsUpgrade || !isBundleReady() || isBundleCurrent()) return toolsUpgrade;
  console.log("[Tools] Updating pymobiledevice3...");
  toolsUpgrade = ensurePymobiledevice3()
    .then((result) => {
      console.log(result.ok ? "[Tools] Up to date" : `[Tools] Update failed: ${result.message}`);
      if (result.ok) require("./usb").clearCachedPaths();
      return result;
    })
    .finally(() => {
      toolsUpgrade = null;
      // Re-apply the current location with the new tools.
      lastSyncedLoc = null;
    });
  return toolsUpgrade;
}

function tryAutoStartSync() {
  const saved = loadSessionFile();
  if (saved?.access_token && saved?.user?.id) {
    console.log("[AutoSync] Auto-starting with saved session");
    startAutoSync(saved);
  }
}

function parseSetupUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "anyloc-setup:") return null;
    const token = url.searchParams.get("token")?.trim();
    const apiBaseUrl = url.searchParams.get("api")?.trim();
    if (!token) return null;
    return { token, apiBaseUrl };
  } catch {
    return null;
  }
}

function deliverLaunchConfig(window) {
  if (!window || !pendingLaunchConfig) return;
  window.webContents.send("setup:launch-config", pendingLaunchConfig);
  pendingLaunchConfig = null;
}

function handleSetupUrl(rawUrl) {
  const config = parseSetupUrl(rawUrl);
  if (!config) return;
  pendingLaunchConfig = config;
  if (mainWindowRef) {
    if (mainWindowRef.isMinimized()) mainWindowRef.restore();
    mainWindowRef.focus();
    deliverLaunchConfig(mainWindowRef);
  }
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAAXNSR0IArs4c6QAAAJRJREFUOBFjYBhowIgbwMDAEA/EP4D4AxA/AOL/uNQxoUsiKUgA4v9AfACIHwDxfyTxBzAxdBNRFCQA8X8gPgDE/4H4PxAfAOIHSGoeIIsx4TOIUfcghBk5mf4DMSNIHxAbA/F/JPoAECMbBDIYJg7SDyJBBuGyhpERWz5CthFkEIi+j8IhEFAdLiADsOUjZE5qGwAclzW6GaTVSwAAAABJRU5ErkJggg=="
  );
  tray = new Tray(icon);
  tray.setToolTip("Anyloc");

  const updateTrayMenu = () => {
    const syncActive = !!autoSyncInterval;
    const locName = lastSyncedLoc?.name || (lastSyncedLoc ? `${lastSyncedLoc.lat.toFixed(4)}, ${lastSyncedLoc.lng.toFixed(4)}` : null);
    const statusLabel = syncActive
      ? locName ? `GPS: ${locName}` : "En attente..."
      : "Sync inactif";

    const menu = Menu.buildFromTemplate([
      { label: "Anyloc", enabled: false },
      { type: "separator" },
      { label: statusLabel, enabled: false },
      { type: "separator" },
      {
        label: "Ouvrir la fenêtre",
        click: () => revealMainWindow(),
      },
      { type: "separator" },
      {
        label: "Quitter",
        click: () => {
          stopAutoSync();
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(menu);
  };

  updateTrayMenu();
  setInterval(updateTrayMenu, 5000);
  tray.on("click", () => revealMainWindow());
  tray.on("double-click", () => revealMainWindow());
}

function revealMainWindow() {
  const wasHidden =
    !mainWindowRef || mainWindowRef.isDestroyed() || !mainWindowRef.isVisible();

  if (!mainWindowRef || mainWindowRef.isDestroyed()) {
    createWindow();
  }
  if (mainWindowRef.isMinimized()) mainWindowRef.restore();
  mainWindowRef.show();
  mainWindowRef.focus();
  if (wasHidden && !mainWindowRef.webContents.isLoading()) {
    mainWindowRef.webContents.send("app:show-guide");
  }
}

function createWindow() {
  const isMac = process.platform === "darwin";
  const previewApp = process.argv.includes("--preview-app");
  const previewGuide = previewApp || process.argv.includes("--preview-guide");
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "Anyloc",
    ...(isMac
      ? { titleBarStyle: "hiddenInset", trafficLightPosition: { x: 16, y: 16 } }
      : { autoHideMenuBar: true }),
    backgroundColor: "#fafafa",
    webPreferences: {
      preload: path.join(
        __dirname,
        previewGuide ? "preview-preload.js" : "preload.js"
      ),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindowRef = window;
  window.loadFile(
    path.join(__dirname, "renderer", previewGuide ? "preview.html" : "index.html"),
    previewApp ? { hash: "app" } : undefined
  );

  window.webContents.on("did-finish-load", () => {
    deliverLaunchConfig(window);
  });

  window.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      window.hide();
    }
  });

  window.on("closed", () => {
    if (mainWindowRef === window) mainWindowRef = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    const setupUrl = commandLine.find((entry) =>
      entry.startsWith("anyloc-setup://")
    );
    if (setupUrl) handleSetupUrl(setupUrl);
    revealMainWindow();
  });
}

// ── Auth IPC ──

async function supabaseFetch(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/auth/v1${endpoint}`;
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

ipcMain.handle("setup:auth", async (_event, action, payload) => {
  try {
    if (action === "login") {
      const res = await supabaseFetch("/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
        }),
      });
      if (!res.ok) {
        return {
          ok: false,
          message:
            res.data?.error_description ||
            res.data?.msg ||
            "Email ou mot de passe incorrect. Si tu as payé sans mot de passe : anyloc.io → Mon compte → choisis-en un.",
        };
      }
      return { ok: true, session: res.data };
    }

    if (action === "signup") {
      const res = await supabaseFetch("/signup", {
        method: "POST",
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
        }),
      });
      if (!res.ok) {
        return {
          ok: false,
          message: res.data?.error_description || res.data?.msg || "Erreur lors de la création du compte.",
        };
      }
      if (res.data?.access_token) {
        return { ok: true, session: res.data };
      }
      return {
        ok: true,
        session: null,
        message: "Vérifie ton email pour confirmer ton compte.",
      };
    }

    if (action === "verify") {
      const token = payload.session?.access_token;
      if (!token) return { ok: false };
      const res = await supabaseFetch("/user", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { ok: false };
      return { ok: true, session: { ...payload.session, user: res.data } };
    }

    if (action === "oauth") {
      const provider = payload?.provider;
      if (!provider) return { ok: false, message: "Provider manquant." };

      return new Promise((resolve) => {
        const redirectUri = `${SUPABASE_URL}/auth/v1/callback`;
        const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectUri)}`;

        const authWin = new BrowserWindow({
          width: 600,
          height: 700,
          title: `Connexion ${provider}`,
          parent: mainWindowRef,
          modal: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        });

        let resolved = false;

        const handleNavigation = (url) => {
          if (resolved) return;
          try {
            const parsed = new URL(url);
            const hash = parsed.hash?.substring(1);
            if (!hash) return;

            const params = new URLSearchParams(hash);
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");

            if (accessToken) {
              resolved = true;
              authWin.close();
              supabaseFetch("/user", {
                method: "GET",
                headers: { Authorization: `Bearer ${accessToken}` },
              }).then((userRes) => {
                if (userRes.ok) {
                  resolve({
                    ok: true,
                    session: {
                      access_token: accessToken,
                      refresh_token: refreshToken,
                      user: userRes.data,
                    },
                  });
                } else {
                  resolve({ ok: false, message: "Impossible de récupérer le profil." });
                }
              });
            }
          } catch {}
        };

        authWin.webContents.on("will-redirect", (_event, url) => {
          handleNavigation(url);
        });

        authWin.webContents.on("did-navigate", (_event, url) => {
          handleNavigation(url);
        });

        authWin.on("closed", () => {
          if (!resolved) resolve({ ok: false, message: "Connexion annulée." });
        });

        authWin.loadURL(authUrl);
      });
    }

    return { ok: false, message: "Action inconnue." };
  } catch (err) {
    return { ok: false, message: `Erreur réseau : ${err.message}` };
  }
});

// ── Platform / config ──

ipcMain.handle("setup:get-platform", () => {
  if (process.platform === "darwin") return "mac";
  if (process.platform === "win32") return "win";
  return process.platform;
});

ipcMain.handle("setup:get-version", () => app.getVersion());

ipcMain.handle("setup:get-launch-config", () => {
  const config = pendingLaunchConfig;
  pendingLaunchConfig = null;
  return config;
});

// ── USB / install ──

ipcMain.handle("setup:ensure-tools", async (event) => {
  const { clearCachedPaths } = require("./usb");
  if (toolsUpgrade) await toolsUpgrade;
  const result = await ensurePymobiledevice3((progress) => {
    try { event.sender.send("setup:tools-progress", progress); } catch {}
  });
  if (result.ok) clearCachedPaths();
  return result;
});

ipcMain.handle("setup:tools-ready", () => {
  if (isBundleReady()) return isBundleCurrent();
  return !!resolvePymobiledevice3Cli();
});

// While the iPhone is plugged in, pair it for Wi-Fi once so it keeps working
// unplugged. One attempt per device per launch: an iPhone below iOS 17 fails
// every time and the UI polls this every 3 s.
const wifiPairingAttempted = new Set();

function pairForWifi(udid) {
  if (!udid || wifiPairingAttempted.has(udid) || hasWifiPairing(udid)) return;
  wifiPairingAttempted.add(udid);
  ensureWifiPairing({ udid }).then((result) => {
    console.log("[Wi-Fi]", result.ok ? `Paired ${udid}` : `Pairing failed: ${result.message}`);
  });
}

// Hands the iPhone app its pairing record so it works with no computer at all.
// Once per device per launch once it lands; retried every minute until the
// Anyloc app is installed on the iPhone.
const appPairingDone = new Set();
const appPairingLastTry = new Map();

function pairForApp(udid) {
  if (!udid || appPairingDone.has(udid)) return;
  if (Date.now() - (appPairingLastTry.get(udid) || 0) < 60000) return;
  appPairingLastTry.set(udid, Date.now());
  pushPairingToApp({ udid }).then((result) => {
    if (result.ok) appPairingDone.add(udid);
    console.log("[App pairing]", result.ok ? `Pushed to ${udid}` : `Push failed: ${result.message}`);
  });
}

ipcMain.handle("setup:check-usb", async (_event, payload) => {
  const device = await detectUsbDevice({
    installTools: payload?.installTools !== false,
  });
  if (device.connected) pairForWifi(device.udid);
  if (device.connected) pairForApp(device.udid);
  return { ...device, wifiPaired: hasWifiPairing(device.connected ? device.udid : null) };
});

ipcMain.handle("setup:open-external", async (_event, url) => {
  const raw = String(url || "");
  if (!raw) return { ok: false };

  const allowedExact = new Set([
    "https://www.python.org/downloads/windows/",
    "https://apps.microsoft.com/detail/9np83lwlpz9k",
    "ms-windows-store://pdp/?ProductId=9NP83LWLPZ9K",
  ]);
  if (allowedExact.has(raw)) {
    await shell.openExternal(raw);
    return { ok: true };
  }

  try {
    const parsed = new URL(raw);
    if (
      parsed.protocol === "https:" &&
      (parsed.hostname === "anyloc.io" ||
        parsed.hostname === "www.anyloc.io" ||
        parsed.hostname.endsWith(".anyloc.io"))
    ) {
      await shell.openExternal(raw);
      return { ok: true };
    }
  } catch {
    // Invalid URL — fall through.
  }

  return { ok: false };
});

// QR code for the iPhone remote, generated locally so it works offline and
// does not depend on the website being deployed.
ipcMain.handle("setup:remote-qr", async () => {
  const QRCode = require("qrcode");
  return QRCode.toDataURL("https://www.anyloc.io/app", {
    width: 296,
    margin: 1,
    color: { dark: "#18181b", light: "#ffffff" },
  });
});

ipcMain.handle("setup:devmode-status", async (_event, payload) => {
  return getDeveloperModeStatus({ udid: payload?.udid ?? null });
});

ipcMain.handle("setup:reveal-devmode", async (_event, payload) => {
  return revealDeveloperMode({ udid: payload?.udid ?? null });
});

ipcMain.handle("setup:apply-gps", async (_event, payload) => {
  return applyGpsLocation({
    udid: payload?.udid ?? null,
    token: payload?.token ?? "",
    apiBaseUrl: payload?.apiBaseUrl ?? "https://www.anyloc.io",
  });
});

// GPS direct — spawn persistent Python process that holds the DVT connection open
ipcMain.handle("setup:apply-gps-direct", async (_event, payload) => {
  const udid = payload?.udid ?? null;
  const lat = payload?.lat;
  const lng = payload?.lng;

  if (lat == null || lng == null) {
    return { ok: false, message: "Coordonnées manquantes." };
  }

  // Kill previous spoof process
  if (spoofProcess) {
    try { spoofProcess.kill("SIGTERM"); } catch {}
    spoofProcess = null;
  }

  const python = resolvePythonExecutable();
  if (!python) {
    return { ok: false, message: missingToolsMessage() };
  }

  const scriptPath = path.join(getScriptsDir(), "spoof_loop.py");
  const args = [scriptPath, `--lat=${lat}`, `--lng=${lng}`];
  if (udid) args.push(`--udid=${udid}`);

  return new Promise((resolve) => {
    const child = spawnChild(python, args, {
      env: getSpawnEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let resolved = false;

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (!resolved) {
        const lines = stdout.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            resolved = true;
            if (parsed.ok) {
              spoofProcess = child;
            }
            resolve(parsed);
            return;
          } catch {}
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      if (!resolved) {
        resolved = true;
        resolve({ ok: false, message: chunk.toString().trim() });
      }
    });

    child.on("close", () => {
      if (spoofProcess === child) spoofProcess = null;
      if (!resolved) {
        resolved = true;
        resolve({ ok: false, message: "Le processus GPS s'est arrêté." });
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ ok: false, message: "Timeout — impossible de simuler le GPS." });
      }
    }, 15000);
  });
});

// Clear simulated location — kill the persistent process
ipcMain.handle("setup:clear-gps", async (_event, payload) => {
  if (spoofProcess) {
    try { spoofProcess.kill("SIGTERM"); } catch {}
    spoofProcess = null;
  }
  return clearGpsLocation({ udid: payload?.udid ?? null });
});

ipcMain.handle("setup:export-pairing", async (_event, payload) => {
  return exportPairingFile({
    udid: payload?.udid ?? null,
    token: payload?.token ?? "",
    apiBaseUrl: payload?.apiBaseUrl ?? "https://www.anyloc.io",
  });
});

ipcMain.handle("setup:save-pairing-local", async (_event, payload) => {
  return savePairingLocalCopy({
    sourcePath: payload?.sourcePath ?? null,
    udid: payload?.udid ?? null,
  });
});

// ── Auto-sync IPC ──

ipcMain.handle("setup:start-autosync", async (_event, payload) => {
  const session = payload?.session;
  if (!session?.access_token || !session?.user?.id) {
    return { ok: false, message: "Session manquante." };
  }
  startAutoSync(session);
  return { ok: true, message: "Auto-sync démarré." };
});

ipcMain.handle("setup:stop-autosync", async () => {
  stopAutoSync();
  clearSessionFile();
  if (spoofProcess) {
    try { spoofProcess.kill("SIGTERM"); } catch {}
    spoofProcess = null;
  }
  await clearGpsLocation({});
  return { ok: true, message: "Auto-sync arrêté, GPS réinitialisé." };
});

ipcMain.handle("setup:live-move", async (_event, payload) => {
  if (payload?.lat == null || payload?.lng == null) {
    return { ok: false, message: "Coordonnées manquantes." };
  }
  return liveMove(payload.lat, payload.lng);
});

ipcMain.handle("setup:play-route", async (_event, payload) => {
  if (!payload?.gpx) return { ok: false, message: "Trajet vide." };
  return playRoute(payload.gpx);
});

ipcMain.handle("setup:stop-live", async () => {
  stopLive();
  return { ok: true };
});

ipcMain.handle("setup:autosync-status", async () => {
  return { active: !!autoSyncInterval };
});

ipcMain.handle("setup:show-item-in-folder", async (_event, payload) => {
  if (!payload?.path) return { ok: false, message: "Chemin manquant." };
  shell.showItemInFolder(payload.path);
  return { ok: true };
});

// ── App lifecycle ──

app.isQuitting = false;

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.whenReady().then(() => {
  if (process.defaultApp || process.argv.length >= 2) {
    const setupUrl = process.argv.find((entry) =>
      entry.startsWith("anyloc-setup://")
    );
    if (setupUrl) handleSetupUrl(setupUrl);
  }

  if (process.platform === "win32") {
    Menu.setApplicationMenu(null);
  }

  if (process.platform === "win32" || process.platform === "linux") {
    app.setAsDefaultProtocolClient("anyloc-setup");
  } else {
    app.setAsDefaultProtocolClient("anyloc-setup", process.execPath, [
      path.resolve(process.argv[1] ?? "."),
    ]);
  }

  // Preview modes run on fake data: never touch the real session or login items.
  const isPreview = process.argv.includes("--preview-app") || process.argv.includes("--preview-guide");

  // Auto-launch at startup
  if (!isPreview) {
    app.setLoginItemSettings(
      process.platform === "darwin" ? { openAtLogin: true, openAsHidden: true } : { openAtLogin: true }
    );
  }

  // Tray icon in menu bar (no visible window)
  createTray();

  createWindow();

  if (!isPreview) upgradeToolsIfOutdated();

  const savedSession = isPreview ? null : loadSessionFile();
  if (savedSession?.access_token) {
    tryAutoStartSync();
  }
  // Always show on launch so user can see the dashboard
  mainWindowRef?.show();

  app.on("activate", () => {
    revealMainWindow();
  });
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleSetupUrl(url);
});

app.on("window-all-closed", () => {
  // On macOS, the tray keeps running. On Windows/Linux, quit when all windows close.
  if (process.platform !== "darwin") {
    stopAutoSync();
    app.quit();
  }
});
