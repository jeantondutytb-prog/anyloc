const { contextBridge } = require("electron");

const demoSession = {
  access_token: "preview-token",
  user: { id: "preview-user", email: "demo@anyloc.io" },
};

contextBridge.exposeInMainWorld("anylocSetup", {
  getPlatform: () => Promise.resolve("mac"),
  getLaunchConfig: () => Promise.resolve(null),
  onLaunchConfig: () => () => {},
  ensureTools: () => Promise.resolve({ ok: true }),
  toolsReady: () => Promise.resolve(true),
  onToolsProgress: () => () => {},
  checkUsb: () =>
    Promise.resolve({
      connected: true,
      deviceName: "iPhone 15 Pro",
      udid: "preview-udid",
    }),
  openExternal: () => Promise.resolve(),
  ensureIpa: () => Promise.resolve({ ok: true }),
  installIos: () => Promise.resolve({ ok: true }),
  applyGps: () => Promise.resolve({ ok: true }),
  applyGpsDirect: () => Promise.resolve({ ok: true }),
  clearGps: () => Promise.resolve({ ok: true }),
  exportPairing: () => Promise.resolve({ ok: true }),
  savePairingLocal: () => Promise.resolve({ ok: true }),
  showItemInFolder: () => Promise.resolve(),
  auth: (action, payload) => {
    if (action === "verify") {
      return Promise.resolve({ ok: true, session: payload?.session || demoSession });
    }
    return Promise.resolve({ ok: false, message: "Preview mode" });
  },
  startAutoSync: () => Promise.resolve(),
  stopAutoSync: () => Promise.resolve(),
  getAutoSyncStatus: () => Promise.resolve({ running: false }),
  onAutoSyncStatus: () => {},
  getVersion: () => Promise.resolve("0.3.2"),
  onShowGuide: () => {},
});

contextBridge.exposeInMainWorld("__ANYLOC_PREVIEW__", true);
