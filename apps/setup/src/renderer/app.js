const STORAGE_KEYS = {
  session: "anyloc.session",
  iphoneInstalled: "anyloc.iphoneInstalled",
};

let session = null;
let desktopPlatform = "mac";

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
  guidePlatform = desktopPlatform;
  document.body.dataset.platform = desktopPlatform;

  const isWin = desktopPlatform === "win";
  const computerLabel = isWin ? "PC Windows" : "Mac";
  const computerShort = isWin ? "PC" : "Mac";

  const guideStep1Title = $("guide-step1-title");
  if (guideStep1Title) {
    guideStep1Title.textContent = isWin ? "Prépare ton PC" : "Prépare ton Mac";
  }

  const platformReq = $("guide-platform-req");
  if (platformReq) {
    platformReq.textContent = isWin ? "ce PC Windows" : "ce Mac";
  }

  const guideHint = $("guide-win-hint");
  if (guideHint) guideHint.hidden = !isWin;

  const usbHelpWin = $("guide-usb-help-win");
  if (usbHelpWin) usbHelpWin.hidden = !isWin;

  const readyStep2 = $("ready-step2-text");
  if (readyStep2) {
    readyStep2.innerHTML = `Sur l'iPhone, ou ici sur le ${computerShort}.`;
  }

  const readyStep3Title = $("ready-step3-title");
  if (readyStep3Title) {
    readyStep3Title.textContent = isWin ? "Le PC applique le GPS" : "Le Mac applique le GPS";
  }

  const readyStep3Text = $("ready-step3-text");
  if (readyStep3Text) {
    readyStep3Text.textContent = isWin
      ? "Garde cette app ouverte (icône près de l'horloge) — ta fausse position se met à jour toute seule sur Snap, Insta, Tinder…"
      : "Garde cette app ouverte (barre de menus) — ta fausse position se met à jour toute seule sur Snap, Insta, Tinder…";
  }

  const deviceLabel = $("profil-device");
  if (deviceLabel) {
    deviceLabel.textContent = computerLabel;
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

  $("profil-email").textContent = session.user?.email || "…";
  void applyPlatformHints();

  if (!isGuideComplete()) {
    showGuide();
    return;
  }

  showScreen("main");
  homeEnter(session);

  if (!guideAutoSyncStarted) {
    window.anylocSetup.startAutoSync({ session });
    guideAutoSyncStarted = true;
  }
  bindAutoSyncHandlers();
}

function logout() {
  window.anylocSetup.stopAutoSync();
  guideAutoSyncStarted = false;
  stopGuideUsbPolling();
  void homeLeave();
  homeReset();
  clearSession();
  showScreen("login");
  $("login-email").value = "";
  $("login-password").value = "";
  $("login-error").textContent = "";
}

// ── Onboarding Guide ──

let guideStep = 1;
let guideUsbInterval = null;
let guidePlatform = "mac";
let guideDetectedUdid = null;

const GUIDE_DONE_KEY = "anyloc.guideComplete";
const GUIDE_TOTAL_STEPS = 6;

const GUIDE_STARTER_SPOTS = [
  { name: "Marbella", country: "Espagne", lat: 36.5099, lng: -4.8862, emoji: "🇪🇸" },
  { name: "Paris", country: "France", lat: 48.8584, lng: 2.2945, emoji: "🇫🇷" },
  { name: "Miami Beach", country: "États-Unis", lat: 25.7907, lng: -80.13, emoji: "🇺🇸" },
];

let guideAutoSyncStarted = false;
let autoSyncHandlersBound = false;
let guideSelectedSpot = null;

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
  void homeLeave();
  guideStep = 1;
  guideDetectedUdid = null;
  showScreen("guide");
  updateGuideStep();
}

function updateGuideStep() {
  for (let i = 1; i <= GUIDE_TOTAL_STEPS; i++) {
    const el = $(`guide-step-${i}`);
    if (el) el.hidden = i !== guideStep;
  }

  const pct = (guideStep / GUIDE_TOTAL_STEPS) * 100;
  $("guide-progress-bar").style.width = pct + "%";
  $("guide-step-label").textContent = `Étape ${guideStep} / ${GUIDE_TOTAL_STEPS}`;

  if (guideStep === 1) initGuideToolsStep();
  if (guideStep === 2) startGuideUsbPolling();
  else stopGuideUsbPolling();
  if (guideStep === 3) void startGuideDevModeStep();
  else stopGuideDevModePolling();
  if (guideStep === 4) void showRemoteQr();
  if (guideStep === 5) initGuideCityStep();
  if (guideStep === 6) initGuideVerifyStep();
}

function bindAutoSyncHandlers() {
  if (autoSyncHandlersBound) return;
  autoSyncHandlersBound = true;

  window.anylocSetup.onAutoSyncStatus((status) => {
    homeOnAutoSync(status);
    if (!status.error && status.location?.is_active && guideStep === 5 && guideSelectedSpot) {
      updateGuideCityStatus(true, guideSelectedSpot.name);
    }
  });
}

function ensureGuideAutoSync() {
  if (!session || guideAutoSyncStarted) return;
  guideAutoSyncStarted = true;
  window.anylocSetup.startAutoSync({ session });
  bindAutoSyncHandlers();
}

function initGuideCityStep() {
  ensureGuideAutoSync();
  guideSelectedSpot = null;

  const grid = $("guide-city-grid");
  const nextBtn = $("guide-city-next");
  const statusBox = $("guide-city-status");

  if (!grid || !nextBtn) return;

  statusBox.hidden = true;
  nextBtn.disabled = true;

  grid.innerHTML = GUIDE_STARTER_SPOTS.map((spot, index) =>
    `<button type="button" class="guide-city-btn" data-city="${index}">
      <span class="guide-city-emoji">${spot.emoji}</span>
      <span class="guide-city-name">${escapeHtml(spot.name)}</span>
      <span class="guide-city-country">${escapeHtml(spot.country)}</span>
    </button>`
  ).join("");

  grid.querySelectorAll(".guide-city-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const spot = GUIDE_STARTER_SPOTS[parseInt(btn.dataset.city, 10)];
      if (spot) void selectGuideCity(spot, btn);
    });
  });
}

async function selectGuideCity(spot, btn) {
  const grid = $("guide-city-grid");
  grid?.querySelectorAll(".guide-city-btn").forEach((el) => el.classList.remove("active"));
  btn?.classList.add("active");

  guideSelectedSpot = spot;
  updateGuideCityStatus(false, spot.name);

  const ok = await applyGuideSpot(spot);
  if (ok) {
    updateGuideCityStatus(true, spot.name);
    $("guide-city-next").disabled = false;
  }
}

function updateGuideCityStatus(applied, cityName) {
  const statusBox = $("guide-city-status");
  const text = $("guide-city-text");
  const hint = $("guide-city-hint");
  if (!statusBox || !text || !hint) return;

  statusBox.hidden = false;
  statusBox.className = applied ? "guide-status-box ok" : "guide-status-box";

  if (applied) {
    text.textContent = `${cityName} — GPS activé`;
    hint.textContent = "Ouvre Snap ou Maps sur ton iPhone pour vérifier.";
  } else {
    text.textContent = `Activation de ${cityName}…`;
    hint.textContent = "Garde l'iPhone branché en USB.";
  }
}

async function applyGuideSpot(spot) {
  const ok = await upsertLocation({ name: spot.name, lat: spot.lat, lng: spot.lng, isActive: true });
  if (ok) homeSetActive(spot);
  return ok;
}

function initGuideVerifyStep() {
  const cityLabel = $("guide-verify-city");
  if (cityLabel) {
    cityLabel.textContent = guideSelectedSpot?.name || "ta ville";
  }

  const bgText = $("guide-verify-bg-text");
  if (bgText) {
    const isWin = guidePlatform === "win";
    bgText.textContent = isWin
      ? "Garde Anyloc Setup ouvert (icône près de l'horloge) tant que l'iPhone est branché."
      : "Garde Anyloc Setup ouvert (barre de menus) tant que l'iPhone est branché.";
  }
}

function guideNext() {
  if (guideStep < GUIDE_TOTAL_STEPS) {
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

// ── Step 3: developer mode ──
// The iPhone "app" is the web remote at anyloc.io/app, so nothing is
// installed on the phone. Location simulation only needs Developer Mode.

let guideDevModeInterval = null;

const ICON_OK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';
const ICON_WAIT = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
const ICON_ERROR = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>';

function setDevModeStatus(state, text, hint) {
  const icon = $("guide-devmode-icon");
  icon.className = `guide-status-icon ${state === "ok" ? "ok" : state === "error" ? "error" : "searching"}`;
  icon.innerHTML = state === "ok" ? ICON_OK : state === "error" ? ICON_ERROR : ICON_WAIT;
  $("guide-devmode-status").className = `guide-status-box${state === "ok" ? " ok" : state === "error" ? " error" : ""}`;
  $("guide-devmode-text").textContent = text;
  $("guide-devmode-hint").textContent = hint;
}

function stopGuideDevModePolling() {
  if (guideDevModeInterval) {
    clearInterval(guideDevModeInterval);
    guideDevModeInterval = null;
  }
}

async function startGuideDevModeStep() {
  stopGuideDevModePolling();
  $("guide-devmode-retry").hidden = true;
  setDevModeStatus("wait", "Préparation de l'iPhone...", "On fait apparaître l'option dans les Réglages.");

  const revealed = await window.anylocSetup.revealDevMode({ udid: guideDetectedUdid });

  if (revealed.ok && revealed.enabled) {
    onDevModeEnabled();
    return;
  }

  if (!revealed.ok) {
    setDevModeStatus("error", "L'iPhone ne répond pas", revealed.message || "Rebranche l'iPhone et réessaie.");
    $("guide-devmode-retry").hidden = false;
    return;
  }

  setDevModeStatus(
    "wait",
    "En attente du mode développeur...",
    "Active-le dans les Réglages de l'iPhone. On détecte tout seul quand c'est fait."
  );
  guideDevModeInterval = setInterval(pollDevMode, 3000);
}

async function pollDevMode() {
  const status = await window.anylocSetup.devModeStatus({ udid: guideDetectedUdid });

  if (status.ok && status.enabled) {
    onDevModeEnabled();
    return;
  }

  // While the iPhone reboots it disappears from USB: keep waiting quietly.
  if (!status.ok) {
    setDevModeStatus(
      "wait",
      "L'iPhone redémarre ?",
      "Déverrouille-le après le redémarrage et appuie sur « Activer »."
    );
  }
}

async function showRemoteQr() {
  const img = $("guide-qr");
  if (!img || img.src) return;
  try {
    img.src = await window.anylocSetup.getRemoteQr();
    img.hidden = false;
  } catch {
    // The anyloc.io/app link is still written out below the QR code.
  }
}

function onDevModeEnabled() {
  stopGuideDevModePolling();
  setDevModeStatus("ok", "Mode développeur activé", "Tout est prêt.");
  markIphoneInstalled();
  ensureGuideAutoSync();
  if (guideStep === 3) setTimeout(guideNext, 800);
}

function showReadyScreen() {
  stopGuideUsbPolling();
  stopGuideDevModePolling();
  showScreen("ready");
}

function finishReadyScreen() {
  markGuideComplete();
  markIphoneInstalled();
  enterMain();
}

// ── Init ──

async function init() {
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

  // Logout
  $("logout-btn").addEventListener("click", logout);
  $("manage-subscription-btn")?.addEventListener("click", () => {
    void window.anylocSetup.openExternal("https://anyloc.io/dashboard?tab=account");
  });

  // Guide
  void applyPlatformHints();

  $("guide-win-itunes-btn")?.addEventListener("click", () => {
    void window.anylocSetup.openExternal("https://apps.microsoft.com/detail/9np83lwlpz9k");
  });

  $("guide-skip-btn")?.addEventListener("click", () => {
    markGuideComplete();
    enterMain();
  });
  $("guide-tools-next")?.addEventListener("click", guideNext);
  $("guide-tools-retry")?.addEventListener("click", initGuideToolsStep);
  $("guide-usb-next")?.addEventListener("click", guideNext);
  $("guide-devmode-retry")?.addEventListener("click", () => void startGuideDevModeStep());
  $("guide-trust-next")?.addEventListener("click", guideNext);
  $("guide-city-next")?.addEventListener("click", guideNext);
  $("guide-verify-done")?.addEventListener("click", () => finishReadyScreen());
  $("guide-verify-skip")?.addEventListener("click", () => finishReadyScreen());
  $("ready-dashboard-btn")?.addEventListener("click", () => finishReadyScreen());
  $("ready-try-btn")?.addEventListener("click", () => finishReadyScreen());

  // Profile: reopen guide
  $("reopen-guide-btn").addEventListener("click", () => {
    clearGuideComplete();
    showGuide();
  });
}

void init();
