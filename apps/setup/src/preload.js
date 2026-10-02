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
  installAppleDriver: () => ipcRenderer.invoke("setup:install-apple-driver"),
  openExternal: (url) => ipcRenderer.invoke("setup:open-external", url),
  devModeStatus: (payload) => ipcRenderer.invoke("setup:devmode-status", payload),
  revealDevMode: (payload) => ipcRenderer.invoke("setup:reveal-devmode", payload),
  getLocalDevVpnQr: () => ipcRenderer.invoke("setup:localdevvpn-qr"),
  applyGps: (payload) => ipcRenderer.invoke("setup:apply-gps", payload),
  applyGpsDirect: (payload) => ipcRenderer.invoke("setup:apply-gps-direct", payload),
  clearGps: (payload) => ipcRenderer.invoke("setup:clear-gps", payload),
  liveMove: (payload) => ipcRenderer.invoke("setup:live-move", payload),
  playRoute: (payload) => ipcRenderer.invoke("setup:play-route", payload),
  stopLive: () => ipcRenderer.invoke("setup:stop-live"),
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
  setSession: (session) => ipcRenderer.invoke("setup:set-session", session),
  onSession: (callback) => {
    const listener = (_event, session) => callback(session);
    ipcRenderer.on("setup:session", listener);
    return () => ipcRenderer.removeListener("setup:session", listener);
  },
  iphoneAppStatus: () => ipcRenderer.invoke("setup:iphone-app-status"),
  iphoneAppRegister: (payload) => ipcRenderer.invoke("setup:iphone-app-register", payload),
  iphoneAppInstall: (payload) => ipcRenderer.invoke("setup:iphone-app-install", payload),
  getVersion: () => ipcRenderer.invoke("setup:get-version"),
  onShowGuide: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("app:show-guide", listener);
    return () => ipcRenderer.removeListener("app:show-guide", listener);
  },
});
