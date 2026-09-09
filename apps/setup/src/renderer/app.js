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
    title: "Colle ton token et applique la position",
    description:
      "Choisis Marbella (ou autre) sur le dashboard, puis clique « Appliquer la position GPS ».",
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

function getApiBaseUrl() {
  const value = document.getElementById("api-base-url").value.trim();
  return value || "https://anyloc.io";
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
    document.getElementById("api-base-url").value = savedApiBaseUrl;
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
      setStatus("install-status", "Tu peux aussi installer l'app native Anyloc.", "ok");
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
    "Synchronisation auto activée. Change la position sur le dashboard, elle sera appliquée toutes les 10 secondes.",
    "ok"
  );
}

async function init() {
  renderSteps();
  restoreSettings();
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
