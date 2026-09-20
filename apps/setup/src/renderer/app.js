/* global L */

const NOMINATIM = "https://nominatim.openstreetmap.org";
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const STORAGE_KEYS = {
  session: "anyloc.session",
  favorites: "anyloc.favorites",
  lastPosition: "anyloc.lastPosition",
  iphoneInstalled: "anyloc.iphoneInstalled",
  iosDeviceToken: "anyloc.iosDeviceToken",
};

const API_BASE_URL = "https://www.anyloc.io";

let map = null;
let marker = null;
let selectedPosition = null;
let activeSpoof = null;
let searchTimeout = null;
let session = null;
let favorites = [];
let toastTimer = null;
let desktopPlatform = "mac";
let usbConnected = false;
let usbDeviceName = null;
let lastSyncAt = null;
let statusUsbInterval = null;

// ── Helpers ──

function $(id) { return document.getElementById(id); }

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(name + "-screen").classList.add("active");
}

function showToast(message, type = "info", duration = 3000) {
  const toast = $("status-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = "status-toast " + type;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, duration);
}

function persistSession(s) {
  try { localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(s)); } catch {}
}
function restoreSession() {
  try { const s = localStorage.getItem(STORAGE_KEYS.session); return s ? JSON.parse(s) : null; } catch { return null; }
}
function clearSession() {
  session = null;
  try { localStorage.removeItem(STORAGE_KEYS.session); } catch {}
}

function persistFavorites() {
  try { localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites)); } catch {}
}
function restoreFavorites() {
  try { const s = localStorage.getItem(STORAGE_KEYS.favorites); if (s) favorites = JSON.parse(s); } catch {}
}

// ── Tabs ──

function switchTab(tabName) {
  document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));

  $("tab-" + tabName)?.classList.add("active");
  document.querySelector(`.tab-btn[data-tab="${tabName}"]`)?.classList.add("active");

  if (tabName === "statut") {
    void refreshUsbStatus();
  }

  if (tabName === "carte" && !map) initMap();
  if (tabName === "carte" && map) setTimeout(() => map.invalidateSize(), 50);
}

function formatRelativeSync(date) {
  if (!date) return "Sync automatique en attente";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 5) return "Dernière sync : à l'instant";
  if (seconds < 60) return `Dernière sync : il y a ${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Dernière sync : il y a ${minutes} min`;
  return `Dernière sync : il y a ${Math.floor(minutes / 60)} h`;
}

function setStatusCardState(cardId, dotId, state, valueText) {
  const card = $(cardId);
  const dot = $(dotId);
  const value = $(valueText);
  if (!card || !dot || !value) return;

  card.classList.remove("ok", "warn", "error");
  dot.classList.remove("ok", "warn", "error");
  if (state) {
    card.classList.add(state);
    dot.classList.add(state);
  }
}

function updateStatusDashboard() {
  const iphoneText = $("status-iphone-text");
  const gpsText = $("status-gps-text");
  const locationName = $("status-location-name");
  const locationMeta = $("status-location-meta");
  const syncText = $("status-sync-text");
  const locationPanel = $("status-location-panel");
  const stopBtn = $("status-stop-btn");

  if (!iphoneText) return;

  if (usbConnected) {
    setStatusCardState("status-iphone-card", "status-iphone-dot", "ok", "status-iphone-text");
    iphoneText.textContent = usbDeviceName ? `${usbDeviceName} — connecté` : "iPhone connecté";
  } else {
    setStatusCardState("status-iphone-card", "status-iphone-dot", "warn", "status-iphone-text");
    iphoneText.textContent = "Non connecté — branche ton iPhone en USB";
  }

  if (activeSpoof) {
    setStatusCardState("status-gps-card", "status-gps-dot", "ok", "status-gps-text");
    gpsText.textContent = "Actif sur ton iPhone";
    locationPanel?.classList.add("active");
    locationName.textContent = activeSpoof.name || "Destination active";
    locationMeta.textContent = `${activeSpoof.lat.toFixed(4)}, ${activeSpoof.lng.toFixed(4)}`;
    if (stopBtn) stopBtn.hidden = false;
  } else {
    setStatusCardState("status-gps-card", "status-gps-dot", "warn", "status-gps-text");
    gpsText.textContent = usbConnected ? "En attente d'une destination" : "Inactif";
    locationPanel?.classList.remove("active");
    locationName.textContent = "Aucune destination active";
    locationMeta.textContent = usbConnected
      ? "Choisis un lieu sur ton iPhone ou via la carte."
      : "Branche ton iPhone pour appliquer une fausse position.";
    if (stopBtn) stopBtn.hidden = true;
  }

  if (syncText) {
    syncText.textContent = formatRelativeSync(lastSyncAt);
  }
}

async function refreshUsbStatus() {
  try {
    const result = await window.anylocSetup.checkUsb();
    usbConnected = Boolean(result?.connected);
    usbDeviceName = result?.deviceName || null;
  } catch {
    usbConnected = false;
    usbDeviceName = null;
  }
  updateStatusDashboard();
}

function startStatusUsbPolling() {
  stopStatusUsbPolling();
  void refreshUsbStatus();
  statusUsbInterval = setInterval(() => {
    void refreshUsbStatus();
  }, 3000);
}

function stopStatusUsbPolling() {
  if (statusUsbInterval) {
    clearInterval(statusUsbInterval);
    statusUsbInterval = null;
  }
}

// ── Auth ──

let isSignupMode = false;

async function handleLogin(email, password) {
  $("login-submit").disabled = true;
  $("login-error").textContent = "";

  const result = await window.anylocSetup.auth(
    isSignupMode ? "signup" : "login",
    { email, password }
  );

  $("login-submit").disabled = false;

  if (!result.ok) {
    $("login-error").textContent = result.message || "Erreur de connexion.";
    return;
  }

  session = result.session;
  persistSession(session);
  afterAuth();
}

async function handleOAuth(provider) {
  const result = await window.anylocSetup.auth("oauth", { provider });
  if (!result.ok) {
    $("login-error").textContent = result.message || "Erreur OAuth.";
    return;
  }
  session = result.session;
  persistSession(session);
  afterAuth();
}

function afterAuth() {
  enterMain();
}

function hasInstalledIphone() {
  try { return localStorage.getItem(STORAGE_KEYS.iphoneInstalled) === "1"; } catch { return false; }
}

function markIphoneInstalled() {
  try { localStorage.setItem(STORAGE_KEYS.iphoneInstalled, "1"); } catch {}
}

async function applyPlatformHints() {
  try {
    desktopPlatform = (await window.anylocSetup.getPlatform()) || desktopPlatform;
  } catch {}
  document.body.dataset.platform = desktopPlatform;
  const guideHint = $("guide-win-hint");
  if (guideHint) guideHint.hidden = desktopPlatform !== "win";
  const deviceLabel = $("profil-device");
  if (deviceLabel) {
    deviceLabel.textContent = desktopPlatform === "win" ? "Windows" : "Mac";
  }

  const versionLabel = $("profil-version");
  if (versionLabel) {
    try {
      const version = await window.anylocSetup.getVersion();
      versionLabel.textContent = version ? `Anyloc ${version}` : "—";
    } catch {
      versionLabel.textContent = "—";
    }
  }
}

async function fillGuideVersion() {
  const el = $("guide-version");
  if (!el) return;
  try {
    const version = await window.anylocSetup.getVersion();
    if (version) el.textContent = `Anyloc ${version}`;
  } catch {}
}

function enterMain() {
  if (!session) return;

  const email = session.user?.email || "...";
  $("profil-email").textContent = email;
  void applyPlatformHints();

  if (!isGuideComplete()) {
    showGuide();
    return;
  }

  showScreen("main");
  switchTab("statut");
  startStatusUsbPolling();

  window.anylocSetup.startAutoSync({ session });
  window.anylocSetup.onAutoSyncStatus((status) => {
    if (status.error) {
      showToast(status.message, "error");
    } else if (status.message) {
      lastSyncAt = new Date();
      if (status.location?.is_active) {
        const loc = status.location;
        const name = loc.name || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
        setSelectedPosition(loc.lat, loc.lng, name);
        if (map) map.setView([loc.lat, loc.lng], 14);
        activeSpoof = { lat: loc.lat, lng: loc.lng, name };
        updateBottomSheet();
        showToast(`GPS appliqué : ${name}`, "ok");
      } else if (status.location && !status.location.is_active) {
        activeSpoof = null;
        updateBottomSheet();
        showToast("GPS réinitialisé", "ok");
      } else {
        showToast(status.message, "ok");
      }
      updateStatusDashboard();
    }
  });

  updateStatusDashboard();
}

function logout() {
  window.anylocSetup.stopAutoSync();
  stopGuideUsbPolling();
  stopStatusUsbPolling();
  clearSession();
  activeSpoof = null;
  selectedPosition = null;
  lastSyncAt = null;
  usbConnected = false;
  usbDeviceName = null;
  showScreen("login");
  $("login-email").value = "";
  $("login-password").value = "";
  $("login-error").textContent = "";
}

// ── Map ──

function initMap() {
  map = L.map("map", {
    center: [25.2048, 55.2708],
    zoom: 4,
    zoomControl: true,
    attributionControl: true,
  });

  L.tileLayer(TILE_URL, {
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  L.Icon.Default.imagePath = "./images/";

  map.on("click", (e) => {
    setSelectedPosition(e.latlng.lat, e.latlng.lng, null);
    reverseGeocode(e.latlng.lat, e.latlng.lng);
  });

  const savedPos = restoreLastPosition();
  if (savedPos) {
    setSelectedPosition(savedPos.lat, savedPos.lng, savedPos.name);
    map.setView([savedPos.lat, savedPos.lng], 12);
  }
}

function restoreLastPosition() {
  try { const s = localStorage.getItem(STORAGE_KEYS.lastPosition); return s ? JSON.parse(s) : null; } catch { return null; }
}

function setSelectedPosition(lat, lng, name) {
  selectedPosition = { lat, lng, name: name || `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
  try { localStorage.setItem(STORAGE_KEYS.lastPosition, JSON.stringify(selectedPosition)); } catch {}

  if (marker) {
    marker.setLatLng([lat, lng]);
  } else if (map) {
    marker = L.marker([lat, lng]).addTo(map);
  }

  updateBottomSheet();
}

function updateBottomSheet() {
  const container = $("sheet-content");
  if (!selectedPosition) {
    container.innerHTML = '<p class="sheet-placeholder">Clique sur la carte ou cherche un lieu</p>';
    return;
  }

  const pos = selectedPosition;
  const isActive = !!activeSpoof;
  const btnLabel = isActive ? "Mettre à jour" : "Téléporter";

  let favsHtml = "";
  if (favorites.length) {
    favsHtml = `<div class="sheet-favorites">${favorites.map((f, i) =>
      `<button class="fav-chip" data-fav="${i}">${escapeHtml(f.name)}</button>`
    ).join("")}</div>`;
  }

  container.innerHTML = `
    <div class="sheet-location">
      <div class="sheet-info">
        <div class="sheet-name">${escapeHtml(pos.name)}</div>
        <div class="sheet-coords">${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}</div>
      </div>
      <button class="sheet-fav-btn" id="sheet-fav">♥</button>
    </div>
    <div class="sheet-buttons">
      <button class="sheet-teleport-btn" id="sheet-teleport">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
        ${btnLabel}
      </button>
      ${isActive ? '<button class="sheet-stop-btn" id="sheet-stop">Stop</button>' : ""}
    </div>
    ${favsHtml}
  `;

  $("sheet-teleport")?.addEventListener("click", teleportViaSupabase);
  $("sheet-stop")?.addEventListener("click", stopSpoofViaSupabase);
  $("sheet-fav")?.addEventListener("click", saveFavorite);

  container.querySelectorAll(".fav-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const fav = favorites[parseInt(chip.dataset.fav, 10)];
      if (fav) {
        setSelectedPosition(fav.lat, fav.lng, fav.name);
        map?.setView([fav.lat, fav.lng], 14);
      }
    });
  });
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=0`,
      { headers: { "Accept-Language": "fr" } }
    );
    const data = await res.json();
    if (data.display_name) {
      const name = data.display_name.split(",").slice(0, 2).join(",").trim();
      selectedPosition.name = name;
      try { localStorage.setItem(STORAGE_KEYS.lastPosition, JSON.stringify(selectedPosition)); } catch {}
      updateBottomSheet();
    }
  } catch {}
}

// ── Search ──

function handleSearch(query) {
  clearTimeout(searchTimeout);
  $("search-clear").hidden = !query;

  if (!query || query.length < 2) {
    $("search-results").hidden = true;
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(
        `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=0`,
        { headers: { "Accept-Language": "fr" } }
      );
      const results = await res.json();
      renderSearchResults(results);
    } catch {}
  }, 350);
}

function renderSearchResults(results) {
  const container = $("search-results");
  if (!results.length) { container.hidden = true; return; }

  container.innerHTML = results.map((r) => {
    const name = r.display_name.split(",").slice(0, 3).join(",").trim();
    return `<div class="search-result" data-lat="${r.lat}" data-lng="${r.lon}" data-name="${escapeHtml(name)}">${escapeHtml(name)}</div>`;
  }).join("");

  container.hidden = false;
}

// ── Teleport via Supabase (same as iOS) ──

async function teleportViaSupabase() {
  if (!selectedPosition || !session) return;
  $("sheet-teleport").disabled = true;

  try {
    const url = `https://gqkxnktprctdvpwvnqli.supabase.co/rest/v1/location_settings?on_conflict=user_id`;
    const body = {
      user_id: session.user.id,
      name: selectedPosition.name,
      lat: selectedPosition.lat,
      lng: selectedPosition.lng,
      is_active: true,
      accuracy: 10,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxa3hua3RwcmN0ZHZwd3ZucWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODUxMTgsImV4cCI6MjEwNDM2MTExOH0.7kOHGgU1s1EDr0luSvDxvcGj3pyOt-8_79dX4sg8kXA",
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      activeSpoof = { ...selectedPosition };
      lastSyncAt = new Date();
      showToast(`Téléporté à ${selectedPosition.name}`, "ok");
      updateBottomSheet();
      updateStatusDashboard();
    } else {
      showToast("Erreur de téléportation", "error");
    }
  } catch (err) {
    showToast(err.message, "error");
  }

  const btn = $("sheet-teleport");
  if (btn) btn.disabled = false;
}

async function stopSpoofViaSupabase() {
  if (!selectedPosition || !session) return;

  try {
    const url = `https://gqkxnktprctdvpwvnqli.supabase.co/rest/v1/location_settings?on_conflict=user_id`;
    const body = {
      user_id: session.user.id,
      name: selectedPosition.name,
      lat: selectedPosition.lat,
      lng: selectedPosition.lng,
      is_active: false,
      accuracy: 10,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxa3hua3RwcmN0ZHZwd3ZucWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODUxMTgsImV4cCI6MjEwNDM2MTExOH0.7kOHGgU1s1EDr0luSvDxvcGj3pyOt-8_79dX4sg8kXA",
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      activeSpoof = null;
      lastSyncAt = new Date();
      showToast("GPS réinitialisé", "ok");
      updateBottomSheet();
      updateStatusDashboard();
    }
  } catch {}
}

// ── Favorites ──

function saveFavorite() {
  if (!selectedPosition) return;
  const exists = favorites.some((f) => f.lat === selectedPosition.lat && f.lng === selectedPosition.lng);
  if (exists) { showToast("Déjà dans tes favoris", "info"); return; }
  favorites.push({ ...selectedPosition });
  persistFavorites();
  updateBottomSheet();
  showToast("Favori ajouté", "ok");
}

// ── Onboarding Guide ──

let guideStep = 1;
let guideUsbInterval = null;
let guidePlatform = "mac";
let guideDetectedUdid = null;

const GUIDE_DONE_KEY = "anyloc.guideComplete";

function isGuideComplete() {
  try { return localStorage.getItem(GUIDE_DONE_KEY) === "true"; } catch { return false; }
}

function markGuideComplete() {
  try { localStorage.setItem(GUIDE_DONE_KEY, "true"); } catch {}
}

function clearGuideComplete() {
  try { localStorage.removeItem(GUIDE_DONE_KEY); } catch {}
}

function showGuide() {
  stopStatusUsbPolling();
  guideStep = 1;
  guideDetectedUdid = null;
  showScreen("guide");
  updateGuideStep();
}

function updateGuideStep() {
  for (let i = 1; i <= 5; i++) {
    const el = $(`guide-step-${i}`);
    if (el) el.hidden = i !== guideStep;
  }

  const pct = (guideStep / 5) * 100;
  $("guide-progress-bar").style.width = pct + "%";
  $("guide-step-label").textContent = `Étape ${guideStep} / 5`;

  if (guideStep === 2) initGuideToolsStep();
  if (guideStep === 3) startGuideUsbPolling();
  else stopGuideUsbPolling();
}

function guideNext() {
  if (guideStep < 5) {
    guideStep++;
    updateGuideStep();
  }
}

async function initGuideToolsStep() {
  const statusBox = $("guide-tools-status");
  const icon = $("guide-tools-icon");
  const text = $("guide-tools-text");
  const hint = $("guide-tools-hint");
  const nextBtn = $("guide-tools-next");
  const retryBtn = $("guide-tools-retry");
  const progressWrap = $("guide-tools-progress");
  const progressBar = $("guide-tools-progress-bar");
  const errorBox = $("guide-tools-error");

  nextBtn.disabled = true;
  retryBtn.hidden = true;
  errorBox.hidden = true;

  const alreadyReady = await window.anylocSetup.toolsReady();
  if (alreadyReady) {
    text.textContent = "Outils USB prêts";
    hint.textContent = "Tout est installé. Tu peux continuer.";
    icon.className = "guide-status-icon ok";
    icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';
    statusBox.className = "guide-status-box ok";
    nextBtn.disabled = false;
    return;
  }

  text.textContent = "Installation en cours...";
  hint.textContent = "Ça peut prendre 1-2 minutes la première fois.";
  icon.className = "guide-status-icon searching";
  statusBox.className = "guide-status-box";
  progressWrap.hidden = false;
  progressBar.style.width = "5%";

  const cleanupProgress = window.anylocSetup.onToolsProgress((progress) => {
    if (progress.message) text.textContent = progress.message;
    if (progress.pct) progressBar.style.width = progress.pct + "%";
  });

  const result = await window.anylocSetup.ensureTools();
  cleanupProgress();

  if (result.ok) {
    text.textContent = "Outils USB prêts !";
    hint.textContent = "Tout est installé. Tu peux continuer.";
    icon.className = "guide-status-icon ok";
    icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';
    statusBox.className = "guide-status-box ok";
    progressBar.style.width = "100%";
    nextBtn.disabled = false;
  } else {
    text.textContent = "Échec de l'installation";
    hint.textContent = "Vérifie ta connexion internet et réessaie.";
    icon.className = "guide-status-icon error";
    icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>';
    statusBox.className = "guide-status-box error";
    progressWrap.hidden = true;
    errorBox.hidden = false;
    $("guide-tools-error-text").textContent = result.message || "Erreur inconnue";
    retryBtn.hidden = false;
  }
}

function startGuideUsbPolling() {
  stopGuideUsbPolling();
  checkGuideUsb();
  guideUsbInterval = setInterval(checkGuideUsb, 2500);
}

function stopGuideUsbPolling() {
  if (guideUsbInterval) {
    clearInterval(guideUsbInterval);
    guideUsbInterval = null;
  }
}

async function checkGuideUsb() {
  const statusBox = $("guide-usb-status");
  const icon = $("guide-usb-icon");
  const text = $("guide-usb-text");
  const hint = $("guide-usb-hint");
  const nextBtn = $("guide-usb-next");

  const result = await window.anylocSetup.checkUsb();

  if (result.connected) {
    stopGuideUsbPolling();
    guideDetectedUdid = result.udid;
    text.textContent = `${result.deviceName} — connecté`;
    hint.textContent = "iPhone détecté ! Tu peux continuer.";
    icon.className = "guide-status-icon ok";
    icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';
    statusBox.className = "guide-status-box ok";
    nextBtn.disabled = false;
  } else {
    text.textContent = "Recherche d'un iPhone...";
    hint.textContent = "Branche ton iPhone en USB pour continuer.";
    icon.className = "guide-status-icon searching";
    icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
    statusBox.className = "guide-status-box";
    nextBtn.disabled = true;
  }
}

async function guideInstallApp() {
  const btn = $("guide-install-btn");
  const text = $("guide-install-text");
  const hint = $("guide-install-hint");
  const icon = $("guide-install-icon");
  const statusBox = $("guide-install-status-box");

  btn.disabled = true;
  btn.textContent = "Installation en cours...";
  text.textContent = "Téléchargement et installation...";
  hint.textContent = "Ça peut prendre quelques secondes.";
  icon.className = "guide-status-icon searching";

  const ensured = await window.anylocSetup.ensureIpa();
  if (!ensured.ok) {
    text.textContent = "Erreur";
    hint.textContent = ensured.message;
    icon.className = "guide-status-icon error";
    icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>';
    statusBox.className = "guide-status-box error";
    btn.disabled = false;
    btn.textContent = "Réessayer";
    return;
  }

  const result = await window.anylocSetup.installIos({ udid: guideDetectedUdid });

  if (result.ok) {
    $("guide-install-area").hidden = true;
    $("guide-done-area").hidden = false;
    $("guide-final-title").textContent = "C'est prêt !";
    $("guide-final-subtitle").textContent = "";
    $("guide-final-icon").innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';
  } else {
    text.textContent = "Échec de l'installation";
    hint.textContent = result.message;
    icon.className = "guide-status-icon error";
    icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>';
    statusBox.className = "guide-status-box error";
    btn.disabled = false;
    btn.textContent = "Réessayer";
  }
}

function guideFinish() {
  markGuideComplete();
  stopGuideUsbPolling();
  // Re-enter main which will now pass the isGuideComplete check
  enterMain();
}

// ── Init ──

async function init() {
  restoreFavorites();
  void applyPlatformHints();
  void fillGuideVersion();

  try {
    const saved = restoreSession();
    if (saved?.access_token) {
      const verified = await window.anylocSetup.auth("verify", { session: saved });
      if (verified.ok) {
        session = verified.session || saved;
        persistSession(session);
      } else {
        clearSession();
      }
    }
  } catch {
    clearSession();
  }

  if (session) afterAuth();

  // Handle launch config
  const launchConfig = await window.anylocSetup.getLaunchConfig();
  if (launchConfig?.token && session) showToast("Connecté depuis le site.", "ok");

  window.anylocSetup.onLaunchConfig((config) => {
    if (config?.token && session) showToast("Configuration reçue.", "ok");
  });

  window.anylocSetup.onShowGuide?.(() => {
    if (session) showGuide();
  });

  // Login
  $("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    handleLogin($("login-email").value, $("login-password").value);
  });
  $("login-google").addEventListener("click", () => handleOAuth("google"));
  $("toggle-signup").addEventListener("click", (e) => {
    e.preventDefault();
    isSignupMode = !isSignupMode;
    $("login-submit").textContent = isSignupMode ? "Créer mon compte" : "Se connecter";
    $("toggle-signup").textContent = isSignupMode ? "Déjà un compte ? Se connecter" : "Créer un compte";
    $("login-error").textContent = "";
  });

  // Tab bar
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Status dashboard actions
  $("status-change-btn")?.addEventListener("click", () => switchTab("carte"));
  $("status-stop-btn")?.addEventListener("click", () => {
    void stopSpoofViaSupabase();
  });
  $("status-reconfig-btn")?.addEventListener("click", () => showGuide());

  // Logout
  $("logout-btn").addEventListener("click", logout);
  $("manage-subscription-btn")?.addEventListener("click", () => {
    void window.anylocSetup.openExternal("https://anyloc.io/dashboard?tab=account");
  });

  // Search
  $("search-input").addEventListener("input", (e) => handleSearch(e.target.value));
  $("search-input").addEventListener("keydown", (e) => {
    if (e.key === "Escape") { $("search-results").hidden = true; $("search-input").blur(); }
  });
  $("search-clear").addEventListener("click", () => {
    $("search-input").value = "";
    $("search-clear").hidden = true;
    $("search-results").hidden = true;
  });

  $("search-results").addEventListener("click", (e) => {
    const item = e.target.closest(".search-result");
    if (!item) return;
    const lat = parseFloat(item.dataset.lat);
    const lng = parseFloat(item.dataset.lng);
    const name = item.dataset.name;
    setSelectedPosition(lat, lng, name);
    map.setView([lat, lng], 14);
    $("search-results").hidden = true;
    $("search-input").value = name;
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".map-search") && !e.target.closest(".search-results")) {
      $("search-results").hidden = true;
    }
  });

  // Guide
  window.anylocSetup.getPlatform().then((p) => {
    guidePlatform = p;
    $("guide-platform-req").textContent = p === "win" ? "Ce PC Windows" : "Ce Mac";
  });

  $("guide-start-btn").addEventListener("click", guideNext);
  $("guide-skip-btn").addEventListener("click", () => {
    markGuideComplete();
    enterMain();
  });
  $("guide-tools-next").addEventListener("click", guideNext);
  $("guide-tools-retry").addEventListener("click", initGuideToolsStep);
  $("guide-usb-next").addEventListener("click", guideNext);
  $("guide-devmode-next").addEventListener("click", guideNext);
  $("guide-install-btn").addEventListener("click", guideInstallApp);
  $("guide-finish-btn").addEventListener("click", guideFinish);

  // Profile: reopen guide
  $("reopen-guide-btn").addEventListener("click", () => {
    clearGuideComplete();
    showGuide();
  });
}

void init();
