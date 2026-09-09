const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("anylocSetup", {
  getPlatform: () => ipcRenderer.invoke("setup:get-platform"),
  checkUsb: () => ipcRenderer.invoke("setup:check-usb"),
  ensureIpa: () => ipcRenderer.invoke("setup:ensure-ipa"),
  installIos: (payload) => ipcRenderer.invoke("setup:install-ios", payload),
  applyGps: (payload) => ipcRenderer.invoke("setup:apply-gps", payload),
  exportPairing: (payload) => ipcRenderer.invoke("setup:export-pairing", payload),
  savePairingLocal: (payload) => ipcRenderer.invoke("setup:save-pairing-local", payload),
  showItemInFolder: (payload) => ipcRenderer.invoke("setup:show-item-in-folder", payload),
});
