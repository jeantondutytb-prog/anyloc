/* global L */

const NOMINATIM = "https://nominatim.openstreetmap.org";
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const STORAGE_KEYS = {
  session: "anyloc.session",
  favorites: "anyloc.favorites",
  lastPosition: "anyloc.lastPosition",
};

// ── Spots data (same as iOS) ──
const spotCategories = [
  { id: "all", label: "Tout" },
  { id: "villes", label: "Villes" },
  { id: "plages", label: "Plages" },
  { id: "fetes", label: "Fêtes" },
  { id: "luxe", label: "Luxe" },
  { id: "asie", label: "Asie" },
  { id: "aeroports", label: "Aéroports" },
];

const allSpots = [
  { name: "Dubai Marina", country: "Émirats", lat: 25.0805, lng: 55.1403, category: "luxe", emoji: "🇦🇪" },
  { name: "Burj Khalifa", country: "Émirats", lat: 25.1972, lng: 55.2744, category: "luxe", emoji: "🇦🇪" },
  { name: "Palm Jumeirah", country: "Émirats", lat: 25.1124, lng: 55.139, category: "luxe", emoji: "🇦🇪" },
  { name: "Miami Beach", country: "États-Unis", lat: 25.7907, lng: -80.13, category: "plages", emoji: "🇺🇸" },
  { name: "South Beach", country: "États-Unis", lat: 25.7826, lng: -80.1341, category: "plages", emoji: "🇺🇸" },
  { name: "Ibiza Town", country: "Espagne", lat: 38.9067, lng: 1.4206, category: "fetes", emoji: "🇪🇸" },
  { name: "Playa d'en Bossa", country: "Espagne", lat: 38.8767, lng: 1.4024, category: "fetes", emoji: "🇪🇸" },
  { name: "Marbella", country: "Espagne", lat: 36.5099, lng: -4.8862, category: "plages", emoji: "🇪🇸" },
  { name: "Puerto Banús", country: "Espagne", lat: 36.4848, lng: -4.9526, category: "luxe", emoji: "🇪🇸" },
  { name: "Mykonos", country: "Grèce", lat: 37.4467, lng: 25.3289, category: "fetes", emoji: "🇬🇷" },
  { name: "Santorin", country: "Grèce", lat: 36.3932, lng: 25.4615, category: "plages", emoji: "🇬🇷" },
  { name: "Monaco", country: "Monaco", lat: 43.7384, lng: 7.4246, category: "luxe", emoji: "🇲🇨" },
  { name: "Paris", country: "France", lat: 48.8584, lng: 2.2945, category: "villes", emoji: "🇫🇷" },
  { name: "Saint-Tropez", country: "France", lat: 43.2727, lng: 6.6407, category: "luxe", emoji: "🇫🇷" },
  { name: "Courchevel", country: "France", lat: 45.4151, lng: 6.6347, category: "luxe", emoji: "🇫🇷" },
  { name: "Londres", country: "Royaume-Uni", lat: 51.5007, lng: -0.1246, category: "villes", emoji: "🇬🇧" },
  { name: "New York", country: "États-Unis", lat: 40.758, lng: -73.9855, category: "villes", emoji: "🇺🇸" },
  { name: "Los Angeles", country: "États-Unis", lat: 34.0195, lng: -118.4912, category: "villes", emoji: "🇺🇸" },
  { name: "Las Vegas", country: "États-Unis", lat: 36.1147, lng: -115.1728, category: "fetes", emoji: "🇺🇸" },
  { name: "Tokyo", country: "Japon", lat: 35.6595, lng: 139.7005, category: "asie", emoji: "🇯🇵" },
  { name: "Bali", country: "Indonésie", lat: -8.6912, lng: 115.1682, category: "plages", emoji: "🇮🇩" },
  { name: "Phuket", country: "Thaïlande", lat: 7.8966, lng: 98.2969, category: "plages", emoji: "🇹🇭" },
  { name: "Bangkok", country: "Thaïlande", lat: 13.7397, lng: 100.5599, category: "asie", emoji: "🇹🇭" },
  { name: "Singapour", country: "Singapour", lat: 1.2834, lng: 103.8607, category: "asie", emoji: "🇸🇬" },
  { name: "Barcelone", country: "Espagne", lat: 41.3784, lng: 2.1925, category: "villes", emoji: "🇪🇸" },
  { name: "Marrakech", country: "Maroc", lat: 31.6295, lng: -7.9811, category: "villes", emoji: "🇲🇦" },
  { name: "Cancún", country: "Mexique", lat: 21.1619, lng: -86.8515, category: "plages", emoji: "🇲🇽" },
  { name: "Tulum", country: "Mexique", lat: 20.2114, lng: -87.4654, category: "plages", emoji: "🇲🇽" },
  { name: "Rio", country: "Brésil", lat: -22.9711, lng: -43.1822, category: "plages", emoji: "🇧🇷" },
  { name: "Sydney", country: "Australie", lat: -33.8915, lng: 151.2767, category: "plages", emoji: "🇦🇺" },
  { name: "CDG Paris", country: "France", lat: 49.0097, lng: 2.5479, category: "aeroports", emoji: "✈️" },
  { name: "JFK New York", country: "États-Unis", lat: 40.6413, lng: -73.7781, category: "aeroports", emoji: "✈️" },
  { name: "LAX Los Angeles", country: "États-Unis", lat: 33.9425, lng: -118.408, category: "aeroports", emoji: "✈️" },
  { name: "DXB Dubai", country: "Émirats", lat: 25.2532, lng: 55.3657, category: "aeroports", emoji: "✈️" },
  { name: "Heathrow", country: "Royaume-Uni", lat: 51.47, lng: -0.4543, category: "aeroports", emoji: "✈️" },
];

let map = null;
let marker = null;
let selectedPosition = null;
let activeSpoof = null;
let searchTimeout = null;
let session = null;
let favorites = [];
let toastTimer = null;
let selectedCategory = "all";

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

  if (tabName === "carte" && !map) initMap();
  if (tabName === "carte" && map) setTimeout(() => map.invalidateSize(), 50);
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
  enterMain();
}

async function handleOAuth(provider) {
  const result = await window.anylocSetup.auth("oauth", { provider });
  if (!result.ok) {
    $("login-error").textContent = result.message || "Erreur OAuth.";
    return;
  }
  session = result.session;
  persistSession(session);
  enterMain();
}

function enterMain() {
  if (!session) return;

  const email = session.user?.email || "...";
  $("profil-email").textContent = email;

  showScreen("main");
  switchTab("carte");

  window.anylocSetup.startAutoSync({ session });
  window.anylocSetup.onAutoSyncStatus((status) => {
    if (status.error) {
      showToast(status.message, "error");
    } else if (status.message) {
      showToast(status.message, "ok");
      if (status.location?.is_active) {
        const loc = status.location;
        const name = loc.name || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
        setSelectedPosition(loc.lat, loc.lng, name);
        if (map) map.setView([loc.lat, loc.lng], 14);
        activeSpoof = { lat: loc.lat, lng: loc.lng, name };
        updateBottomSheet();
      } else if (status.location && !status.location.is_active) {
        activeSpoof = null;
        updateBottomSheet();
      }
    }
  });
}

function logout() {
  window.anylocSetup.stopAutoSync();
  clearSession();
  activeSpoof = null;
  selectedPosition = null;
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
      showToast(`Téléporté à ${selectedPosition.name}`, "ok");
      updateBottomSheet();
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
      showToast("GPS réinitialisé", "ok");
      updateBottomSheet();
    }
  } catch {}
}

// ── Spots tab ──

function renderSpots() {
  const pills = $("category-pills");
  pills.innerHTML = spotCategories.map((c) =>
    `<button class="pill-btn ${c.id === selectedCategory ? "active" : ""}" data-cat="${c.id}">${c.label}</button>`
  ).join("");

  const filtered = selectedCategory === "all" ? allSpots : allSpots.filter((s) => s.category === selectedCategory);
  const grid = $("spots-grid");
  grid.innerHTML = filtered.map((s, i) =>
    `<div class="spot-card" data-spot="${i}">
      <div class="spot-emoji">${s.emoji}</div>
      <div class="spot-name">${escapeHtml(s.name)}</div>
      <div class="spot-country">${escapeHtml(s.country)}</div>
    </div>`
  ).join("");
}

async function teleportSpot(spot) {
  if (!session) return;
  const status = $("spots-status");

  try {
    const url = `https://gqkxnktprctdvpwvnqli.supabase.co/rest/v1/location_settings?on_conflict=user_id`;
    const body = {
      user_id: session.user.id,
      name: spot.name,
      lat: spot.lat,
      lng: spot.lng,
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
      status.textContent = `Téléporté à ${spot.name}`;
      status.className = "spots-status ok";
    } else {
      status.textContent = "Erreur";
      status.className = "spots-status error";
    }
  } catch (err) {
    status.textContent = err.message;
    status.className = "spots-status error";
  }

  status.hidden = false;
  setTimeout(() => { status.hidden = true; }, 3000);
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

// ── Setup modal ──

async function openSetup() {
  $("setup-overlay").hidden = false;
  const result = await window.anylocSetup.checkUsb();
  if (result.connected) {
    $("setup-usb-status").textContent = `${result.deviceName} — connecté`;
    $("setup-usb-status").className = "setup-status ok";
    $("setup-install-btn").disabled = false;
  } else {
    $("setup-usb-status").textContent = "Aucun iPhone détecté.";
    $("setup-usb-status").className = "setup-status error";
    $("setup-install-btn").disabled = true;
  }
}

async function setupInstall() {
  $("setup-install-btn").disabled = true;
  $("setup-install-status").textContent = "Installation...";
  $("setup-install-status").className = "setup-status info";

  const ensured = await window.anylocSetup.ensureIpa();
  if (!ensured.ok) {
    $("setup-install-status").textContent = ensured.message;
    $("setup-install-status").className = "setup-status error";
    $("setup-install-btn").disabled = false;
    return;
  }

  const usb = await window.anylocSetup.checkUsb();
  const result = await window.anylocSetup.installIos({ udid: usb.udid });
  $("setup-install-status").textContent = result.ok ? "App installée !" : result.message;
  $("setup-install-status").className = result.ok ? "setup-status ok" : "setup-status error";
  $("setup-install-btn").disabled = false;
}

// ── Init ──

async function init() {
  restoreFavorites();
  renderSpots();

  const saved = restoreSession();
  if (saved?.access_token) {
    const verified = await window.anylocSetup.auth("verify", { session: saved });
    if (verified.ok) {
      session = verified.session || saved;
      persistSession(session);
      enterMain();
    } else {
      clearSession();
    }
  }

  // Handle launch config
  const launchConfig = await window.anylocSetup.getLaunchConfig();
  if (launchConfig?.token && session) showToast("Connecté depuis le site.", "ok");

  window.anylocSetup.onLaunchConfig((config) => {
    if (config?.token && session) showToast("Configuration reçue.", "ok");
  });

  // ── Event listeners ──

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

  // Logout
  $("logout-btn").addEventListener("click", logout);

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

  // Spots
  $("category-pills").addEventListener("click", (e) => {
    const btn = e.target.closest(".pill-btn");
    if (!btn) return;
    selectedCategory = btn.dataset.cat;
    renderSpots();
  });

  $("spots-grid").addEventListener("click", (e) => {
    const card = e.target.closest(".spot-card");
    if (!card) return;
    const filtered = selectedCategory === "all" ? allSpots : allSpots.filter((s) => s.category === selectedCategory);
    const spot = filtered[parseInt(card.dataset.spot, 10)];
    if (spot) teleportSpot(spot);
  });

  // Setup
  $("setup-install-btn").addEventListener("click", setupInstall);
  $("setup-close-btn").addEventListener("click", () => { $("setup-overlay").hidden = true; });
}

void init();
