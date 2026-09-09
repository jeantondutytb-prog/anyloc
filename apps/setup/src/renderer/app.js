const STEPS = [
  {
    title: "Installe les outils USB sur ton Mac",
    description:
      "Terminal : pip3 install pymobiledevice3 — puis Revérifier dans Anyloc Setup.",
  },
  {
    title: "Branche ton iPhone en USB",
    description:
      "Accepte « Faire confiance à cet ordinateur » sur l'écran du téléphone.",
  },
  {
    title: "Active le mode développeur",
    description:
      "Réglages → Confidentialité et sécurité → tout en bas → Mode développeur.",
  },
  {
    title: "Installe l'app et configure ton token",
    description:
      "Installe l'app Anyloc via Setup, colle ton code dans l'app, puis choisis ta ville directement sur ton iPhone.",
  },
];

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
  const applyButton = document.getElementById("apply-gps");
  const syncButton = document.getElementById("toggle-sync");
  const hasToken = Boolean(getTokenValue());
  const usbReady = Boolean(lastUsbState?.connected);

  installButton.disabled = !usbReady || !lastUsbState?.installReady;
  applyButton.disabled = !usbReady || !hasToken;
  syncButton.disabled = !usbReady || !hasToken;
  syncButton.textContent = `Synchronisation auto : ${syncEnabled ? "on" : "off"}`;
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

async function init() {
  renderSteps();
  restoreSettings();
  await prepareNativeApp();
  await refreshUsbStatus();
  updateActionButtons();

  document.getElementById("refresh-usb").addEventListener("click", () => {
    void refreshUsbStatus();
  });

  document.getElementById("install-ios").addEventListener("click", () => {
    void installIos();
  });

  document.getElementById("apply-gps").addEventListener("click", () => {
    void applyGps();
  });

  document.getElementById("toggle-sync").addEventListener("click", () => {
    toggleSync();
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
