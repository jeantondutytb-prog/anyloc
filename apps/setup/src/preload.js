const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("anylocSetup", {
  getPlatform: () => ipcRenderer.invoke("setup:get-platform"),
  checkUsb: () => ipcRenderer.invoke("setup:check-usb"),
});
