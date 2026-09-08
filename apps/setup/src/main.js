const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

function createWindow() {
  const window = new BrowserWindow({
    width: 960,
    height: 700,
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
  // Placeholder — branchera pymobiledevice3 / idevice_id à l'étape suivante.
  return {
    connected: false,
    deviceName: null,
    message:
      "Branche ton iPhone en USB et accepte « Faire confiance à cet ordinateur ».",
  };
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
