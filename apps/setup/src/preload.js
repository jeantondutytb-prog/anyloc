const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("anylocSetup", {
  getPlatform: () => ipcRenderer.invoke("setup:get-platform"),
  getLaunchConfig: () => ipcRenderer.invoke("setup:get-launch-config"),
  onLaunchConfig: (callback) => {
    const listener = (_event, config) => callback(config);
    ipcRenderer.on("setup:launch-config", listener);
    return () => ipcRenderer.removeListener("setup:launch-config", listener);
  },
  ensureTools: () => ipcRenderer.invoke("setup:ensure-tools"),
  toolsReady: () => ipcRenderer.invoke("setup:tools-ready"),
  onToolsProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("setup:tools-progress", listener);
    return () => ipcRenderer.removeListener("setup:tools-progress", listener);
  },
  checkUsb: (payload) => ipcRenderer.invoke("setup:check-usb", payload),
  openExternal: (url) => ipcRenderer.invoke("setup:open-external", url),
  devModeStatus: (payload) => ipcRenderer.invoke("setup:devmode-status", payload),
  revealDevMode: (payload) => ipcRenderer.invoke("setup:reveal-devmode", payload),
  getRemoteQr: () => ipcRenderer.invoke("setup:remote-qr"),
  applyGps: (payload) => ipcRenderer.invoke("setup:apply-gps", payload),
  applyGpsDirect: (payload) => ipcRenderer.invoke("setup:apply-gps-direct", payload),
  clearGps: (payload) => ipcRenderer.invoke("setup:clear-gps", payload),
  exportPairing: (payload) => ipcRenderer.invoke("setup:export-pairing", payload),
  savePairingLocal: (payload) => ipcRenderer.invoke("setup:save-pairing-local", payload),
  showItemInFolder: (payload) => ipcRenderer.invoke("setup:show-item-in-folder", payload),
  auth: (action, payload) => ipcRenderer.invoke("setup:auth", action, payload),

  // Auto-sync
  startAutoSync: (payload) => ipcRenderer.invoke("setup:start-autosync", payload),
  stopAutoSync: () => ipcRenderer.invoke("setup:stop-autosync"),
  getAutoSyncStatus: () => ipcRenderer.invoke("setup:autosync-status"),
  onAutoSyncStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("autosync:status", listener);
    return () => ipcRenderer.removeListener("autosync:status", listener);
  },
  getVersion: () => ipcRenderer.invoke("setup:get-version"),
  onShowGuide: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("app:show-guide", listener);
    return () => ipcRenderer.removeListener("app:show-guide", listener);
  },
});
