const STORAGE_KEYS = {
  session: "anyloc.session",
  autoConnectTried: "anyloc.autoConnectTried",
};

const CONNECT_URL = "https://www.anyloc.io/desktop/connect";

let session = null;
let desktopPlatform = "mac";

// ── Helpers ──

function $(id) { return document.getElementById(id); }

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
  void window.anylocSetup.setSession?.(null);
}

// Single place a new session lands: renderer, home view and main process
// (which keeps it refreshed) all get the same one.
function adoptSession(s) {
  session = s;
  persistSession(s);
  window.homeSetSession?.(s);
  void window.anylocSetup.setSession?.(s);
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

  if (!result.ok || !result.session) {
    $("login-error").textContent = result.message || "Erreur de connexion.";
    return;
  }

  adoptSession(result.session);
  enterMain();
}

async function handleOAuth(provider) {
  const result = await window.anylocSetup.auth("oauth", { provider });
  if (!result.ok) {
    $("login-error").textContent = result.message || "Erreur OAuth.";
    return;
  }
  adoptSession(result.session);
  enterMain();
}

// The website (already logged in) hands the app a one-time login link.
function connectWithBrowser() {
  $("login-error").textContent = "";
  $("login-browser-hint").textContent = "Accepte « Ouvrir Anyloc » dans ton navigateur…";
  void window.anylocSetup.openExternal(CONNECT_URL);
}

function onLaunchConfig(config) {
  if (!config) return;
  if (config.session) {
    adoptSession(config.session);
    enterMain();
    showToast("Connecté à ton compte Anyloc.", "ok");
  } else if (config.error && !session) {
    $("login-error").textContent = config.error;
  } else if (config.token && session) {
    showToast("Configuration reçue.", "ok");
  }
}

async function applyPlatformHints() {
  try {
    desktopPlatform = (await window.anylocSetup.getPlatform()) || desktopPlatform;
  } catch {}
  document.body.dataset.platform = desktopPlatform;

  const isWin = desktopPlatform === "win";

  const usbHelpWin = $("guide-usb-help-win");
  if (usbHelpWin) usbHelpWin.hidden = !isWin;

  const deviceLabel = $("profil-device");
  if (deviceLabel) deviceLabel.textContent = isWin ? "PC Windows" : "Mac";

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

let autoSyncStarted = false;
let autoSyncHandlersBound = false;

function ensureAutoSync() {
  if (!session || autoSyncStarted) return;
  autoSyncStarted = true;
  window.anylocSetup.startAutoSync({ session });
  if (autoSyncHandlersBound) return;
  autoSyncHandlersBound = true;
  window.anylocSetup.onAutoSyncStatus((status) => homeOnAutoSync(status));
}

function enterMain() {
  if (!session) return;

  $("profil-email").textContent = session.user?.email || "…";
  void applyPlatformHints();

  if (!isGuideComplete()) {
    showGuide();
    return;
  }

  stopGuide();
  showScreen("main");
  homeEnter(session);
  ensureAutoSync();
}

function logout() {
  window.anylocSetup.stopAutoSync();
  autoSyncStarted = false;
  stopGuide();
  void homeLeave();
  homeReset();
  clearSession();
  showScreen("login");
  $("login-email").value = "";
  $("login-password").value = "";
  $("login-error").textContent = "";
  $("login-browser-hint").textContent = "Déjà connecté sur le site ? Un clic suffit.";
}

// ── Onboarding Guide ──
// plug → install → devmode → nocable → done → carte (install et nocable :
// formule 1 an seulement, les autres pilotent la position depuis l'ordinateur)

const GUIDE_DONE_KEY = "anyloc.guideComplete";

const ICON_OK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';
const ICON_WAIT = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
const ICON_ERROR = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>';

const guide = {
  steps: ["plug", "devmode", "done"],
  current: "plug",
  udid: null,
  appEligible: false,
  eligibilityKnown: false,
  instance: 0, // bumps when the guide (re)opens
  usbTimer: null,
  devModeTimer: null,
  installTimer: null,
  run: 0, // bumps on every (re)start so stale async callbacks bail out
};

function isGuideComplete() {
  try { return localStorage.getItem(GUIDE_DONE_KEY) === "true"; } catch { return false; }
}

function markGuideComplete() {
  try { localStorage.setItem(GUIDE_DONE_KEY, "true"); } catch {}
}

function clearGuideComplete() {
  try { localStorage.removeItem(GUIDE_DONE_KEY); } catch {}
}

function setStatus(prefix, state, text, hint = "") {
  const icon = $(`guide-${prefix}-icon`);
  icon.className = `guide-status-icon ${state === "ok" ? "ok" : state === "error" ? "error" : "searching"}`;
  icon.innerHTML = state === "ok" ? ICON_OK : state === "error" ? ICON_ERROR : ICON_WAIT;
  $(`guide-${prefix}-status`).className = `guide-status-box${state === "ok" ? " ok" : state === "error" ? " error" : ""}`;
  $(`guide-${prefix}-text`).textContent = text;
  $(`guide-${prefix}-hint`).textContent = hint;
}

function stopGuide() {
  guide.run++;
  guide.instance++;
  clearInterval(guide.usbTimer);
  clearInterval(guide.devModeTimer);
  clearTimeout(guide.installTimer);
  guide.usbTimer = guide.devModeTimer = guide.installTimer = null;
}

async function showGuide() {
  void homeLeave();
  stopGuide();
  guide.udid = null;
  guide.appEligible = false;
  guide.eligibilityKnown = false;
  guide.steps = ["plug", "devmode", "done"];
  showScreen("guide");
  goToStep("plug");

  // Annual / clipper / admin accounts get the iPhone app; others drive the
  // location from this computer only.
  const instance = ++guide.instance;
  const status = await window.anylocSetup.iphoneAppStatus();
  if (instance !== guide.instance) return;
  guide.appEligible = Boolean(status.ok && status.eligible);
  guide.eligibilityKnown = true;
  guide.steps = guide.appEligible
    ? ["plug", "install", "devmode", "nocable", "done"]
    : ["plug", "devmode", "done"];
  $("guide-done-text").textContent = guide.appEligible
    ? "Change ta position depuis l'app Anyloc sur ton iPhone (LocalDevVPN connecté), ou depuis la carte sur cet ordinateur."
    : "Choisis une ville sur la carte, ta position change tout de suite. Laisse Anyloc ouvert sur cet ordinateur : la position reste active tant que l'iPhone est branché ou sur le même Wi-Fi.";
  renderGuideProgress();
  renderPlugButton();
}

function renderGuideProgress() {
  const index = guide.steps.indexOf(guide.current);
  $("guide-progress-bar").style.width = `${((index + 1) / guide.steps.length) * 100}%`;
  $("guide-step-label").textContent = `Étape ${index + 1} / ${guide.steps.length}`;
}

function goToStep(step) {
  guide.run++;
  guide.current = step;
  for (const name of ["plug", "install", "devmode", "nocable", "done"]) {
    $(`guide-step-${name}`).hidden = name !== step;
  }
  renderGuideProgress();

  clearInterval(guide.usbTimer);
  clearInterval(guide.devModeTimer);
  clearTimeout(guide.installTimer);

  if (step === "plug") void startPlugStep();
  if (step === "install") void startInstallStep();
  if (step === "devmode") void startDevModeStep();
  if (step === "nocable") void showVpnQr();
}

async function showVpnQr() {
  const img = $("guide-vpn-qr");
  if (img.src) return;
  try {
    img.src = await window.anylocSetup.getLocalDevVpnQr();
    img.hidden = false;
  } catch {
    // The App Store name is written out in the first instruction.
  }
}

function nextStep() {
  const index = guide.steps.indexOf(guide.current);
  const next = guide.steps[index + 1];
  if (next) goToStep(next);
  else finishGuide();
}

function finishGuide() {
  markGuideComplete();
  enterMain();
}

// ── Step: plug ──
// Prepares the USB tools silently first, then waits for the iPhone.

async function startPlugStep() {
  const run = guide.run;
  guide.udid = null;
  $("guide-plug-retry").hidden = true;
  renderPlugButton();

  if (!(await window.anylocSetup.toolsReady())) {
    setStatus("plug", "wait", "Préparation d'Anyloc…", "Ça prend environ une minute la première fois.");
    const progressWrap = $("guide-tools-progress");
    const progressBar = $("guide-tools-progress-bar");
    progressWrap.hidden = false;
    progressBar.style.width = "5%";
    const cleanup = window.anylocSetup.onToolsProgress((p) => {
      if (p.pct) progressBar.style.width = `${p.pct}%`;
    });
    const result = await window.anylocSetup.ensureTools();
    cleanup();
    progressWrap.hidden = true;
    if (run !== guide.run) return;

    if (!result.ok) {
      console.warn("[tools]", result.message);
      setStatus(
        "plug",
        "error",
        "Anyloc n'a pas pu se préparer",
        desktopPlatform === "win"
          ? "Vérifie ta connexion internet. Si ton antivirus a bloqué Anyloc, autorise-le, puis réessaie."
          : "Vérifie ta connexion internet, puis réessaie."
      );
      $("guide-plug-retry").hidden = false;
      return;
    }
  }

  setStatus("plug", "wait", "Recherche de ton iPhone…", "Branche-le avec un câble USB.");
  void checkPlug(run);
  guide.usbTimer = setInterval(() => void checkPlug(run), 2500);
}

async function checkPlug(run) {
  const result = await window.anylocSetup.checkUsb();
  if (run !== guide.run || guide.current !== "plug") return;

  if (result.connected) {
    clearInterval(guide.usbTimer);
    guide.udid = result.udid;
    setStatus("plug", "ok", `${result.deviceName} détecté`, "");
    renderDriverBox(null);
    renderPlugButton();
  } else {
    renderDriverBox(result);
    setStatus("plug", "wait", "Recherche de ton iPhone…", "Branche-le avec un câble USB, puis déverrouille-le.");
  }
}

function renderPlugButton() {
  const btn = $("guide-plug-next");
  btn.disabled = !(guide.udid && guide.eligibilityKnown && guide.current === "plug");
  btn.textContent = guide.udid && guide.appEligible ? "Installer l'app sur mon iPhone" : "Continuer";
}

const ITUNES_DOWNLOAD_URL = "https://www.apple.com/itunes/download/win64";

function openItunesDownload() {
  void window.anylocSetup.openExternal(ITUNES_DOWNLOAD_URL);
}

let driverInstalling = false;
let driverNote = null; // last install outcome, kept across polls

// Windows: the iPhone is plugged in but only has the generic photo driver.
function renderDriverBox(result) {
  const box = $("guide-driver-box");
  if (!box || driverInstalling) return;
  box.hidden = !result?.driverMissing;
  if (box.hidden) return;

  const canInstall = Boolean(result.driverInfAvailable);
  $("guide-driver-install-btn").hidden = !canInstall;
  $("guide-driver-itunes-btn").hidden = canInstall;
  $("guide-driver-text").textContent = driverNote || (canInstall
    ? "Clique ci-dessous et accepte la demande de Windows."
    : "Installe iTunes depuis apple.com (pas le Microsoft Store), puis redémarre le PC.");
}

async function installAppleDriver() {
  const btn = $("guide-driver-install-btn");
  driverInstalling = true;
  btn.disabled = true;
  btn.textContent = "Installation…";
  try {
    const result = await window.anylocSetup.installAppleDriver();
    driverNote = result.message;
    $("guide-driver-text").textContent = result.message;
    if (result.needsItunes) {
      btn.hidden = true;
      $("guide-driver-itunes-btn").hidden = false;
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "Installer le pilote Apple";
    driverInstalling = false;
  }
}

// ── Step: install the iPhone app ──
// Registers the UDID, waits for the app signed for this iPhone (a few minutes
// the first time), then installs it over USB.

function installFailed(message) {
  setStatus("install", "error", "L'installation n'a pas abouti", message);
  $("guide-install-retry").hidden = false;
}

async function startInstallStep() {
  const run = guide.run;
  $("guide-install-retry").hidden = true;
  setStatus("install", "wait", "Enregistrement de ton iPhone…", "");

  const registered = await window.anylocSetup.iphoneAppRegister({ udid: guide.udid });
  if (run !== guide.run) return;
  if (!registered.ok) return installFailed(registered.message);

  const startedAt = Date.now();
  const waitForApp = async () => {
    const status = await window.anylocSetup.iphoneAppStatus();
    if (run !== guide.run) return;
    if (!status.ok) return installFailed(status.message);

    const state = status.state?.kind;
    if (state === "failed") return installFailed(status.state.message);
    if (state === "ready") return void installApp(run);

    if (Date.now() - startedAt > 20 * 60 * 1000) {
      return installFailed("Ça prend plus de temps que prévu. Réessaie, ou écris-nous sur le chat.");
    }
    setStatus(
      "install",
      "wait",
      "Préparation de ton app…",
      "Apple signe l'app pour ton iPhone. Ça prend 3 à 5 minutes la première fois, laisse cette fenêtre ouverte."
    );
    guide.installTimer = setTimeout(() => void waitForApp(), 8000);
  };
  void waitForApp();
}

async function installApp(run) {
  setStatus("install", "wait", "Installation sur ton iPhone…", "Garde-le branché et déverrouillé.");
  const result = await window.anylocSetup.iphoneAppInstall({ udid: guide.udid });
  if (run !== guide.run) return;
  if (!result.ok) return installFailed(result.message);

  setStatus("install", "ok", "App installée sur ton iPhone", "");
  guide.installTimer = setTimeout(nextStep, 900);
}

// ── Step: developer mode ──

async function startDevModeStep() {
  const run = guide.run;
  $("guide-devmode-retry").hidden = true;
  setStatus("devmode", "wait", "Préparation de l'iPhone…", "");

  const revealed = await window.anylocSetup.revealDevMode({ udid: guide.udid });
  if (run !== guide.run) return;

  if (revealed.ok && revealed.enabled) return onDevModeEnabled();

  if (!revealed.ok) {
    setStatus("devmode", "error", "L'iPhone ne répond pas", revealed.message || "Rebranche l'iPhone et réessaie.");
    $("guide-devmode-retry").hidden = false;
    return;
  }

  setStatus("devmode", "wait", "En attente…", "Fais les étapes ci-dessus sur ton iPhone. On détecte tout seul quand c'est fait.");
  guide.devModeTimer = setInterval(() => void pollDevMode(run), 3000);
}

async function pollDevMode(run) {
  const status = await window.anylocSetup.devModeStatus({ udid: guide.udid });
  if (run !== guide.run || guide.current !== "devmode") return;

  if (status.ok && status.enabled) return onDevModeEnabled();

  // While the iPhone reboots it disappears from USB: keep waiting quietly.
  if (!status.ok) {
    setStatus("devmode", "wait", "L'iPhone redémarre…", "Après le redémarrage, déverrouille-le et touche « Activer ».");
  }
}

function onDevModeEnabled() {
  clearInterval(guide.devModeTimer);
  setStatus("devmode", "ok", "C'est activé", "");
  ensureAutoSync();
  guide.installTimer = setTimeout(nextStep, 800);
}

// ── Init ──

async function init() {
  // Registered first: a login link can arrive while the saved session is checked.
  window.anylocSetup.onLaunchConfig(onLaunchConfig);
  window.anylocSetup.onSession?.((fresh) => {
    if (!session || fresh?.user?.id !== session.user?.id) return;
    session = fresh;
    persistSession(fresh);
    window.homeSetSession?.(fresh);
  });

  void applyPlatformHints();

  try {
    const saved = restoreSession();
    if (saved?.access_token) {
      const verified = await window.anylocSetup.auth("verify", { session: saved });
      if (verified.ok) adoptSession(verified.session || saved);
      // Offline: keep the saved session rather than logging the user out.
      else if (verified.message) adoptSession(saved);
      else clearSession();
    }
  } catch {
    clearSession();
  }

  if (session) {
    enterMain();
  } else {
    // First launch: try the one-click login through the browser right away.
    try {
      if (!localStorage.getItem(STORAGE_KEYS.autoConnectTried)) {
        localStorage.setItem(STORAGE_KEYS.autoConnectTried, "1");
        connectWithBrowser();
      }
    } catch {}
  }

  onLaunchConfig(await window.anylocSetup.getLaunchConfig());

  window.anylocSetup.onShowGuide?.(() => {
    if (session) showGuide();
  });

  // Login
  $("login-browser").addEventListener("click", connectWithBrowser);
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

  // Account
  $("logout-btn").addEventListener("click", logout);
  $("manage-subscription-btn")?.addEventListener("click", () => {
    void window.anylocSetup.openExternal("https://anyloc.io/dashboard?tab=account");
  });
  $("reopen-guide-btn").addEventListener("click", () => {
    clearGuideComplete();
    showGuide();
  });

  // Guide
  $("guide-driver-itunes-btn")?.addEventListener("click", openItunesDownload);
  $("guide-driver-install-btn")?.addEventListener("click", () => void installAppleDriver());
  $("guide-skip-btn").addEventListener("click", finishGuide);
  $("guide-plug-next").addEventListener("click", nextStep);
  $("guide-plug-retry").addEventListener("click", () => goToStep("plug"));
  $("guide-install-retry").addEventListener("click", () => goToStep("install"));
  $("guide-devmode-retry").addEventListener("click", () => goToStep("devmode"));
  $("guide-nocable-next").addEventListener("click", nextStep);
  $("guide-nocable-skip").addEventListener("click", nextStep);
  $("guide-done-btn").addEventListener("click", finishGuide);
}

void init();
