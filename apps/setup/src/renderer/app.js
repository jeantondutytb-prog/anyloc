const STEPS = [
  {
    title: "Branche ton iPhone avec le câble",
    description:
      "Sur l'iPhone, appuie sur « Faire confiance » quand ça s'affiche.",
  },
  {
    title: "Active le mode développeur sur l'iPhone",
    description:
      "Réglages → Confidentialité et sécurité → tout en bas → Mode développeur → ON → redémarre si demandé.",
  },
  {
    title: "Installe l'app Anyloc sur ton iPhone",
    description:
      "Clique « Installer l'app sur mon iPhone » ci-dessous. Ton mot de passe est déjà rempli.",
  },
  {
    title: "Connecte ton iPhone à ton compte Anyloc",
    description:
      "Clique « Connecter mon iPhone à Anyloc ». Ensuite, scanne le carré sur le site avec l'appareil photo.",
  },
];

let lastPairingSourcePath = null;
let lastPairingUdid = null;

const TOKEN_STORAGE_KEY = "anyloc.deviceToken";
const API_STORAGE_KEY = "anyloc.apiBaseUrl";
const SYNC_INTERVAL_MS = 10000;

let lastUsbState = null;
let syncTimer = null;
let syncEnabled = false;

function renderSteps() {
  const container = document.getElementById("steps");

  container.innerHTML = STEPS.map(
    (step, index) => `
      <article class="step">
        <div class="step-index">${index + 1}</div>
        <div>
          <h3>${step.title}</h3>
          <p>${step.description}</p>
        </div>
      </article>
    `
  ).join("");
}

function setStatus(elementId, message, type = "") {
  const status = document.getElementById(elementId);
  status.textContent = message;
  status.className = `${elementId === "gps-status" ? "install-status gps-status" : "install-status"} ${type}`.trim();
}

function normalizeDeviceToken(raw) {
  let token = String(raw || "").trim();

  if (/^bearer\s+/i.test(token)) {
    token = token.replace(/^bearer\s+/i, "").trim();
  }

  return token.replace(/^["'`]+|["'`]+$/g, "").trim();
}

function getTokenValue() {
  return normalizeDeviceToken(document.getElementById("device-token").value);
}

function normalizeApiBaseUrl(raw) {
  let url = (raw || "https://www.anyloc.io").trim();
  url = url.replace(/\/api\/device\/location\/?$/i, "");
  url = url.replace(/\/$/, "");
  url = url.replace(/^https?:\/\/anyloc\.io$/i, "https://www.anyloc.io");
  return url || "https://www.anyloc.io";
}

function getApiBaseUrl() {
  return normalizeApiBaseUrl(document.getElementById("api-base-url").value);
}

function persistSettings() {
  localStorage.setItem(TOKEN_STORAGE_KEY, getTokenValue());
  localStorage.setItem(API_STORAGE_KEY, getApiBaseUrl());
}

function restoreSettings() {
  const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  const savedApiBaseUrl = localStorage.getItem(API_STORAGE_KEY);

  if (savedToken) {
    document.getElementById("device-token").value = savedToken;
  }

  if (savedApiBaseUrl) {
    document.getElementById("api-base-url").value = normalizeApiBaseUrl(savedApiBaseUrl);
  }
}

function updateActionButtons() {
  const installButton = document.getElementById("install-ios");
  const exportPairingButton = document.getElementById("export-pairing");
  const fullSetupButton = document.getElementById("full-setup");
  const hasToken = Boolean(getTokenValue());
  const usbReady = Boolean(lastUsbState?.connected);

  if (installButton) {
    installButton.disabled = !usbReady || !lastUsbState?.installReady;
  }

  if (exportPairingButton) {
    exportPairingButton.disabled = !usbReady || !hasToken;
  }

  if (fullSetupButton) {
    fullSetupButton.disabled = !usbReady || !hasToken || !lastUsbState?.installReady;
  }
}

async function refreshUsbStatus() {
  const status = document.getElementById("usb-status");

  status.textContent = "Vérification en cours...";
  updateActionButtons();

  const result = await window.anylocSetup.checkUsb();
  lastUsbState = result;

  if (result.connected && result.deviceName) {
    status.textContent = `${result.deviceName} — ${result.message}`;

    if (result.installReady) {
      setStatus("install-status", result.installHint || "App iPhone prête.", "ok");
    } else if (result.installHint) {
      setStatus("install-status", result.installHint, "");
    }

    updateActionButtons();

    if (syncEnabled && getTokenValue()) {
      void applyGps({ silent: true });
    }

    return;
  }

  status.textContent = result.message;
  updateActionButtons();
}

async function runFullSetup() {
  if (!lastUsbState?.connected) {
    setStatus("install-status", "Branche ton iPhone avec le câble d'abord.", "error");
    return;
  }

  if (!getTokenValue()) {
    setStatus(
      "install-status",
      "Ouvre Anyloc sur ton ordi depuis le site — ton mot de passe sera rempli tout seul.",
      "error"
    );
    return;
  }

  setStatus("install-status", "Installation en cours…");
  const installResult = await window.anylocSetup.installIos({
    udid: lastUsbState.udid,
  });

  if (!installResult.ok) {
    setStatus("install-status", installResult.message, "error");
    return;
  }

  setStatus("install-status", installResult.message, "ok");
  await exportPairing();
}

async function exportPairing() {
  if (!lastUsbState?.connected) {
    setStatus(
      "pairing-export-status",
      "Branche ton iPhone avec le câble d'abord.",
      "error"
    );
    return;
  }

  if (!getTokenValue()) {
    setStatus(
      "pairing-export-status",
      "Ouvre Anyloc depuis le site pour remplir ton mot de passe automatiquement.",
      "error"
    );
    return;
  }

  setStatus("pairing-export-status", "Connexion en cours…");
  document.getElementById("save-pairing-local").hidden = true;
  lastPairingSourcePath = null;
  lastPairingUdid = null;

  persistSettings();

  const result = await window.anylocSetup.exportPairing({
    udid: lastUsbState.udid,
    token: getTokenValue(),
    apiBaseUrl: getApiBaseUrl(),
  });

  if (result.ok) {
    lastPairingSourcePath = result.sourcePath;
    lastPairingUdid = result.udid;
    setStatus(
      "pairing-export-status",
      "C'est bon ! Scanne maintenant le carré sur le site avec l'appareil photo de ton iPhone.",
      "ok"
    );
    document.getElementById("save-pairing-local").hidden = false;
    return;
  }

  setStatus("pairing-export-status", result.message, "error");
}

async function savePairingLocalCopy() {
  if (!lastPairingSourcePath) {
    return;
  }

  const result = await window.anylocSetup.savePairingLocal({
    sourcePath: lastPairingSourcePath,
    udid: lastPairingUdid,
  });

  if (result.ok) {
    setStatus("pairing-export-status", result.message, "ok");
    void window.anylocSetup.showItemInFolder({ path: result.path });
    return;
  }

  setStatus("pairing-export-status", result.message, "error");
}

async function installIos() {
  if (!lastUsbState?.connected) {
    setStatus("install-status", "Branche un iPhone avant d'installer.", "error");
    return;
  }

  setStatus("install-status", "Installation en cours...");
  const result = await window.anylocSetup.installIos({
    udid: lastUsbState.udid,
  });

  if (result.ok) {
    setStatus("install-status", result.message, "ok");
    return;
  }

  setStatus("install-status", result.message, "error");
}

async function applyGps({ silent = false } = {}) {
  if (!lastUsbState?.connected) {
    if (!silent) {
      setStatus("gps-status", "Branche un iPhone en USB avant d'appliquer la position.", "error");
    }
    return;
  }

  if (!getTokenValue()) {
    if (!silent) {
      setStatus("gps-status", "Colle ton token appareil depuis le dashboard.", "error");
    }
    return;
  }

  if (!silent) {
    setStatus("gps-status", "Application de la position GPS...");
  }

  persistSettings();

  const result = await window.anylocSetup.applyGps({
    udid: lastUsbState.udid,
    token: getTokenValue(),
    apiBaseUrl: getApiBaseUrl(),
  });

  if (result.ok) {
    setStatus("gps-status", result.message, "ok");
    return;
  }

  if (!silent) {
    setStatus("gps-status", result.message, "error");
  }
}

function stopSync() {
  syncEnabled = false;

  if (syncTimer) {
    window.clearInterval(syncTimer);
    syncTimer = null;
  }

  updateActionButtons();
}

function startSync() {
  stopSync();
  syncEnabled = true;
  updateActionButtons();
  void applyGps({ silent: true });

  syncTimer = window.setInterval(() => {
    void applyGps({ silent: true });
  }, SYNC_INTERVAL_MS);
}

function toggleSync() {
  if (syncEnabled) {
    stopSync();
    setStatus("gps-status", "Synchronisation automatique désactivée.", "");
    return;
  }

  startSync();
  setStatus(
    "gps-status",
    "Synchronisation auto activée (mode USB avancé). Préfère l'app Anyloc sur ton iPhone pour changer de position.",
    "ok"
  );
}

async function prepareNativeApp() {
  setStatus("install-status", "Préparation de l'app iPhone…");

  const result = await window.anylocSetup.ensureIpa();

  if (result.ok) {
    setStatus(
      "install-status",
      "App iPhone prête. Branche ton iPhone puis clique sur Installer.",
      "ok"
    );
    return;
  }

  setStatus("install-status", result.message || "App iPhone indisponible pour le moment.", "error");
}

function applyLaunchConfig(config) {
  if (!config?.token) {
    return;
  }

  document.getElementById("device-token").value = normalizeDeviceToken(config.token);

  if (config.apiBaseUrl) {
    document.getElementById("api-base-url").value = normalizeApiBaseUrl(config.apiBaseUrl);
  }

  persistSettings();
  updateActionButtons();
  setStatus(
    "install-status",
    "Mot de passe reçu depuis le site — branche ton iPhone puis installe l'app.",
    "ok"
  );
}

async function init() {
  renderSteps();
  restoreSettings();

  const launchConfig = await window.anylocSetup.getLaunchConfig();
  if (launchConfig) {
    applyLaunchConfig(launchConfig);
  }

  window.anylocSetup.onLaunchConfig(applyLaunchConfig);
  await prepareNativeApp();
  await refreshUsbStatus();
  updateActionButtons();

  document.getElementById("refresh-usb").addEventListener("click", () => {
    void refreshUsbStatus();
  });

  document.getElementById("install-ios").addEventListener("click", () => {
    void installIos();
  });

  document.getElementById("full-setup").addEventListener("click", () => {
    void runFullSetup();
  });

  document.getElementById("export-pairing").addEventListener("click", () => {
    void exportPairing();
  });

  document.getElementById("save-pairing-local").addEventListener("click", () => {
    void savePairingLocalCopy();
  });

  document.getElementById("device-token").addEventListener("input", () => {
    persistSettings();
    updateActionButtons();
  });

  document.getElementById("api-base-url").addEventListener("input", () => {
    persistSettings();
  });

  const platform = await window.anylocSetup.getPlatform();
  document.title = `Anyloc Setup (${platform})`;
}

void init();
