const { contextBridge, ipcRenderer } = require("electron");

const demoSession = {
  access_token: "preview-token",
  user: { id: "preview-user", email: "demo@anyloc.io" },
};

let devModePolls = 0;
let appStatusPolls = 0;
const wait = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

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
  installAppleDriver: () => Promise.resolve({ ok: true, message: "Pilote Apple installé." }),
  // Simulates the customer enabling Developer Mode a few seconds in.
  revealDevMode: () => Promise.resolve({ ok: true, enabled: false }),
  getLocalDevVpnQr: () => ipcRenderer.invoke("setup:localdevvpn-qr"),
  devModeStatus: () => {
    devModePolls += 1;
    return Promise.resolve({ ok: true, enabled: devModePolls >= 3 });
  },
  applyGps: () => Promise.resolve({ ok: true }),
  applyGpsDirect: () => Promise.resolve({ ok: true }),
  clearGps: () => Promise.resolve({ ok: true }),
  liveMove: () => Promise.resolve({ ok: true }),
  playRoute: () => Promise.resolve({ ok: true }),
  stopLive: () => Promise.resolve({ ok: true }),
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
  setSession: () => Promise.resolve(),
  onSession: () => () => {},
  // Simulates an annual account: the app is signed after two polls.
  iphoneAppStatus: () => {
    appStatusPolls += 1;
    const kind = appStatusPolls >= 4 ? "ready" : "preparing";
    return wait(400, { ok: true, eligible: true, state: { kind }, ipaUrl: null });
  },
  iphoneAppRegister: () => wait(600, { ok: true }),
  iphoneAppInstall: () => wait(1500, { ok: true }),
  getVersion: () => Promise.resolve("0.3.2"),
  onShowGuide: () => {},
});

contextBridge.exposeInMainWorld("__ANYLOC_PREVIEW__", true);
