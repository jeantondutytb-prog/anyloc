const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("anylocSetup", {
  getPlatform: () => ipcRenderer.invoke("setup:get-platform"),
  checkUsb: () => ipcRenderer.invoke("setup:check-usb"),
  installIos: (payload) => ipcRenderer.invoke("setup:install-ios", payload),
  applyGps: (payload) => ipcRenderer.invoke("setup:apply-gps", payload),
});
