const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require("electron");
const { spawn: spawnChild } = require("node:child_process");
const path = require("path");
const {
  detectUsbDevice,
  installIosApp,
  applyGpsLocation,
  ensureIpaAvailable,
  exportPairingFile,
  savePairingLocalCopy,
  applyGpsDirect,
  clearGpsLocation,
  resolvePythonExecutable,
  resolvePymobiledevice3Cli,
  getSpawnEnv,
  getScriptsDir,
} = require("./usb");

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

function applySpoofOnce(lat, lng) {
  const cli = resolvePymobiledevice3Cli();
  if (!cli) return false;

  if (autoSyncSpoofChild) {
    try { autoSyncSpoofChild.kill("SIGTERM"); } catch {}
    autoSyncSpoofChild = null;
  }

  const args = ["developer", "dvt", "simulate-location", "set", "--", String(lat), String(lng)];

  const child = spawnChild(cli, args, {
    env: getSpawnEnv(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  autoSyncSpoofChild = child;
  child.on("close", () => {
    if (autoSyncSpoofChild === child) autoSyncSpoofChild = null;
  });
  child.stderr.on("data", (chunk) => {
    const msg = chunk.toString().trim();
    if (msg && !msg.includes("WARNING")) console.log("[Spoof]", msg);
  });

  return true;
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

function sendSyncStatus(message, error, location) {
  if (mainWindowRef) {
    mainWindowRef.webContents.send("autosync:status", {
      active: true,
      message,
      error: !!error,
      location,
    });
  }
}

function startReapplyLoop(lat, lng) {
  if (reapplyInterval) clearInterval(reapplyInterval);

  applySpoofOnce(lat, lng);

  reapplyInterval = setInterval(() => {
    if (!autoSyncSpoofChild) {
      applySpoofOnce(lat, lng);
      console.log("[AutoSync] Re-applied GPS (process died)");
    }
  }, 5000);
}

function startAutoSync(session) {
  stopAutoSync();
  if (!session?.access_token || !session?.user?.id) return;
  autoSyncSession = session;
  saveSessionFile(session);
  console.log("[AutoSync] Started — polling every 3s, re-apply every 5s");

  autoSyncInterval = setInterval(async () => {
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
        lastSyncedLoc.is_active !== loc.is_active;

      if (!changed) return;
      lastSyncedLoc = loc;

      if (!loc.is_active) {
        killSpoofProcess();
        clearGpsLocation({}).catch(() => {});
        console.log("[AutoSync] GPS cleared");
        sendSyncStatus("GPS réinitialisé", false, loc);
        return;
      }

      // New location — start re-apply loop
      const name = loc.name || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
      console.log(`[AutoSync] GPS → ${name} (${loc.lat}, ${loc.lng})`);
      sendSyncStatus(`GPS: ${name}`, false, loc);
      startReapplyLoop(loc.lat, loc.lng);
    } catch (err) {
      console.error("[AutoSync] Error:", err.message);
    }
  }, 3000);
}

function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    lastSyncedLoc = null;
    killSpoofProcess();
    console.log("[AutoSync] Stopped");
  }
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
        click: () => {
          if (mainWindowRef) {
            mainWindowRef.show();
            mainWindowRef.focus();
          } else {
            createWindow();
          }
        },
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
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "Anyloc",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#0a0a0f",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindowRef = window;
  window.loadFile(path.join(__dirname, "renderer", "index.html"));

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
          message: res.data?.error_description || res.data?.msg || "Email ou mot de passe incorrect.",
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

ipcMain.handle("setup:get-launch-config", () => {
  const config = pendingLaunchConfig;
  pendingLaunchConfig = null;
  return config;
});

// ── USB / install ──

ipcMain.handle("setup:check-usb", async () => {
  return detectUsbDevice();
});

ipcMain.handle("setup:ensure-ipa", async () => {
  return ensureIpaAvailable();
});

ipcMain.handle("setup:install-ios", async (_event, payload) => {
  return installIosApp({ udid: payload?.udid ?? null });
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
    return { ok: false, message: "Python avec pymobiledevice3 introuvable." };
  }

  const scriptPath = path.join(getScriptsDir(), "spoof_loop.py");
  const args = [scriptPath, `--lat=${lat}`, `--lng=${lng}`];
  if (udid) args.push(`--udid=${udid}`);

  return new Promise((resolve) => {
    const child = spawnChild(python, args, {
      env: getSpawnEnv(),
      stdio: ["ignore", "pipe", "pipe"],
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

  if (process.platform === "win32" || process.platform === "linux") {
    app.setAsDefaultProtocolClient("anyloc-setup");
  } else {
    app.setAsDefaultProtocolClient("anyloc-setup", process.execPath, [
      path.resolve(process.argv[1] ?? "."),
    ]);
  }

  // Auto-launch at Mac startup
  app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });

  // Tray icon in menu bar (no visible window)
  createTray();

  createWindow();

  const savedSession = loadSessionFile();
  if (savedSession?.access_token) {
    tryAutoStartSync();
  }
  // Always show on launch so user can see the dashboard
  mainWindowRef?.show();

  app.on("activate", () => {
    if (mainWindowRef) {
      mainWindowRef.show();
      mainWindowRef.focus();
    } else {
      createWindow();
    }
  });
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleSetupUrl(url);
});

app.on("window-all-closed", () => {
  // Don't quit on macOS — tray keeps running
});
