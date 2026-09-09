const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const {
  detectUsbDevice,
  installIosApp,
  applyGpsLocation,
  ensureIpaAvailable,
  exportPairingFile,
  savePairingLocalCopy,
} = require("./usb");

let pendingLaunchConfig = null;
let mainWindowRef = null;

function parseSetupUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "anyloc-setup:") {
      return null;
    }

    const token = url.searchParams.get("token")?.trim();
    const apiBaseUrl = url.searchParams.get("api")?.trim();

    if (!token) {
      return null;
    }

    return { token, apiBaseUrl };
  } catch {
    return null;
  }
}

function deliverLaunchConfig(window) {
  if (!window || !pendingLaunchConfig) {
    return;
  }

  window.webContents.send("setup:launch-config", pendingLaunchConfig);
  pendingLaunchConfig = null;
}

function handleSetupUrl(rawUrl) {
  const config = parseSetupUrl(rawUrl);
  if (!config) {
    return;
  }

  pendingLaunchConfig = config;

  if (mainWindowRef) {
    if (mainWindowRef.isMinimized()) {
      mainWindowRef.restore();
    }
    mainWindowRef.focus();
    deliverLaunchConfig(mainWindowRef);
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: "Anyloc Setup",
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

  window.on("closed", () => {
    if (mainWindowRef === window) {
      mainWindowRef = null;
    }
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    const setupUrl = commandLine.find((entry) => entry.startsWith("anyloc-setup://"));
    if (setupUrl) {
      handleSetupUrl(setupUrl);
    }
  });
}

ipcMain.handle("setup:get-platform", () => {
  if (process.platform === "darwin") {
    return "mac";
  }

  if (process.platform === "win32") {
    return "win";
  }

  return process.platform;
});

ipcMain.handle("setup:get-launch-config", () => {
  const config = pendingLaunchConfig;
  pendingLaunchConfig = null;
  return config;
});

ipcMain.handle("setup:check-usb", async () => {
  return detectUsbDevice();
});

ipcMain.handle("setup:ensure-ipa", async () => {
  return ensureIpaAvailable();
});

ipcMain.handle("setup:install-ios", async (_event, payload) => {
  const udid = payload?.udid ?? null;
  return installIosApp({ udid });
});

ipcMain.handle("setup:apply-gps", async (_event, payload) => {
  const udid = payload?.udid ?? null;
  const token = payload?.token ?? "";
  const apiBaseUrl = payload?.apiBaseUrl ?? "https://www.anyloc.io";

  return applyGpsLocation({ udid, token, apiBaseUrl });
});

ipcMain.handle("setup:export-pairing", async (_event, payload) => {
  const udid = payload?.udid ?? null;
  const token = payload?.token ?? "";
  const apiBaseUrl = payload?.apiBaseUrl ?? "https://www.anyloc.io";

  return exportPairingFile({ udid, token, apiBaseUrl });
});

ipcMain.handle("setup:save-pairing-local", async (_event, payload) => {
  const sourcePath = payload?.sourcePath ?? null;
  const udid = payload?.udid ?? null;

  return savePairingLocalCopy({ sourcePath, udid });
});

ipcMain.handle("setup:show-item-in-folder", async (_event, payload) => {
  const filePath = payload?.path;

  if (!filePath) {
    return { ok: false, message: "Chemin de fichier manquant." };
  }

  shell.showItemInFolder(filePath);
  return { ok: true };
});

app.whenReady().then(() => {
  if (process.defaultApp || process.argv.length >= 2) {
    const setupUrl = process.argv.find((entry) => entry.startsWith("anyloc-setup://"));
    if (setupUrl) {
      handleSetupUrl(setupUrl);
    }
  }

  if (process.platform === "win32" || process.platform === "linux") {
    app.setAsDefaultProtocolClient("anyloc-setup");
  } else {
    app.setAsDefaultProtocolClient("anyloc-setup", process.execPath, [
      path.resolve(process.argv[1] ?? "."),
    ]);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleSetupUrl(url);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
