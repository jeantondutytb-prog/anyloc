const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { detectUsbDevice, installIosApp, applyGpsLocation, ensureIpaAvailable } = require("./usb");

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

  window.loadFile(path.join(__dirname, "renderer", "index.html"));
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

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
