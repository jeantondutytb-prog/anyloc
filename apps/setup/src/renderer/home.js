/* global L */
// Main screen: dark map, rail on the left, control panel on the right.
// Teleport goes through Supabase (auto-sync applies it over USB); walking and
// route playback drive the iPhone directly through the main process.

(function () {
  const LOCATION_URL = "https://gqkxnktprctdvpwvnqli.supabase.co/rest/v1/location_settings?on_conflict=user_id";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxa3hua3RwcmN0ZHZwd3ZucWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODUxMTgsImV4cCI6MjEwNDM2MTExOH0.7kOHGgU1s1EDr0luSvDxvcGj3pyOt-8_79dX4sg8kXA";
  const NOMINATIM = "https://nominatim.openstreetmap.org";
  const ROUTER = "https://routing.openstreetmap.de";
  const TILE_BASE = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
  const TILE_LABELS = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

  const KEYS = {
    favorites: "anyloc.favorites",
    routes: "anyloc.routes",
    home: "anyloc.home",
    lastPosition: "anyloc.lastPosition",
  };

  const SPEEDS = {
    walk: { label: "Marche", kmh: 5, profile: "foot" },
    bike: { label: "Vélo", kmh: 15, profile: "bike" },
    drive: { label: "Voiture", kmh: 60, profile: "car" },
    custom: { label: "Perso", kmh: null, profile: null },
  };
  const CUSTOM_SPEEDS = [3, 8, 10, 20, 30, 90, 130];
  const PAUSE_STEPS = [0, 1, 2, 5, 10];
  const EMOJIS = ["📍", "🏠", "💼", "🎮", "✈️", "☕", "🏖️", "🚗", "⭐", "❤️", "🏋️", "🎓", "🍔", "🌆", "🏔️", "🎉"];
  const WALK_TICK_MS = 200;
  const WALK_PUSH_MS = 500;

  const SPOT_CATEGORIES = [
    { id: "all", label: "Tout" },
    { id: "villes", label: "Villes" },
    { id: "plages", label: "Plages" },
    { id: "fetes", label: "Fêtes" },
    { id: "luxe", label: "Luxe" },
    { id: "asie", label: "Asie" },
    { id: "aeroports", label: "Aéroports" },
  ];

  const SPOTS = [
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

  const svg = (body, cls = "") => `<svg viewBox="0 0 24 24"${cls ? ` class="${cls}"` : ""}>${body}</svg>`;
  const I = {
    nav: svg('<polygon points="3 11 22 2 13 21 11 13 3 11"/>'),
    walk: svg('<circle cx="13" cy="4" r="2"/><path d="m7 21 3-5 3 2v3M6 12l3-4 4-1 2 3 3 1M10 8l-1 6"/>'),
    route: svg('<circle cx="6" cy="19" r="2.5"/><path d="M8.5 19h8a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7h8"/><circle cx="18" cy="5" r="2.5"/>'),
    star: svg('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>', "fill"),
    home: svg('<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'),
    search: svg('<circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/>'),
    pencil: svg('<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'),
    file: svg('<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/>'),
    x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    play: svg('<polygon points="6 3 20 12 6 21 6 3"/>', "fill"),
    stop: svg('<rect x="6" y="6" width="12" height="12" rx="2"/>', "fill"),
    edit: svg('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>'),
    trash: svg('<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
    pin: svg('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
    shield: svg('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'),
    bookmark: svg('<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'),
    crosshair: svg('<circle cx="12" cy="12" r="8"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
    import: svg('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
  };

  // ── State ──

  const S = {
    session: null,
    view: "map", // map | favorites
    mode: "teleport", // teleport | walk | route
    selected: null, // { name, lat, lng }
    active: null, // location currently applied on the iPhone
    usb: { connected: false, name: null },
    lastSyncAt: null,
    applying: false,
    walk: { pos: null, speed: "walk", running: false, heading: 0, trail: [], keys: new Set(), stick: null, lastPush: 0 },
    route: { method: "search", points: [], legs: [], speed: "walk", customKmh: 8, computing: false, gpxName: null, savedId: null },
    runner: null, // { name, legs, speed, total, startedAt, dest }
    fav: { tab: "places", filter: "", cat: "all" },
  };

  let map = null;
  let pinMarker = null;
  let runnerMarker = null;
  let routeGlow = null;
  let routeLine = null;
  let trailLine = null;
  let waypointLayer = null;
  let favoriteLayer = null;
  let usbTimer = null;
  let syncTimer = null;
  let walkTimer = null;
  let runnerTimer = null;
  let searchTimer = null;
  let toastTimer = null;
  let computeSeq = 0;
  let listenersBound = false;

  // ── Helpers ──

  const $ = (id) => document.getElementById(id);
  const esc = (str) => String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const coordsText = (p) => `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;

  function load(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function toast(message, type = "ok", duration = 3000) {
    const el = $("status-toast");
    if (!el) return;
    el.textContent = message;
    el.className = `h-toast ${type === "error" ? "error" : ""}`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, duration);
  }

  function formatDistance(m) {
    return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
  }
  function formatDuration(s) {
    const min = Math.round(s / 60);
    if (min < 60) return `${Math.max(min, 1)} min`;
    return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
  }
  function formatSync(date) {
    if (!date) return "Synchro auto en attente";
    const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (sec < 5) return "Synchro : à l'instant";
    if (sec < 60) return `Synchro : il y a ${sec} s`;
    const min = Math.floor(sec / 60);
    return min < 60 ? `Synchro : il y a ${min} min` : `Synchro : il y a ${Math.floor(min / 60)} h`;
  }

  // ── Geometry ──

  const RAD = Math.PI / 180;
  function distance(a, b) {
    const dLat = (b.lat - a.lat) * RAD;
    const dLng = (b.lng - a.lng) * RAD;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
  }
  function pathLength(coords) {
    let total = 0;
    for (let i = 1; i < coords.length; i++) total += distance(coords[i - 1], coords[i]);
    return total;
  }
  function pointAlong(coords, meters) {
    let left = meters;
    for (let i = 1; i < coords.length; i++) {
      const d = distance(coords[i - 1], coords[i]);
      if (left <= d && d > 0) {
        const f = left / d;
        return { lat: coords[i - 1].lat + (coords[i].lat - coords[i - 1].lat) * f, lng: coords[i - 1].lng + (coords[i].lng - coords[i - 1].lng) * f };
      }
      left -= d;
    }
    return coords[coords.length - 1];
  }
  function positionAt(time, legs, speed) {
    let t = time;
    for (const leg of legs) {
      const legTime = pathLength(leg.coords) / speed;
      if (t <= legTime) return pointAlong(leg.coords, t * speed);
      t -= legTime;
      if (t <= leg.pauseAfter) return leg.coords[leg.coords.length - 1];
      t -= leg.pauseAfter;
    }
    const last = legs[legs.length - 1];
    return last.coords[last.coords.length - 1];
  }
  function offset(pos, bearingDeg, meters) {
    const R = 6371000;
    const d = meters / R;
    const th = bearingDeg * RAD;
    const p1 = pos.lat * RAD;
    const l1 = pos.lng * RAD;
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(th));
    const l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return { lat: p2 / RAD, lng: ((l2 / RAD + 540) % 360) - 180 };
  }
  function compass(deg) {
    return ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(((deg % 360) + 360) % 360 / 45) % 8];
  }

  // ── API ──

  async function upsertLocation({ name, lat, lng, isActive }) {
    if (!S.session) return false;
    try {
      const res = await fetch(LOCATION_URL, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${S.session.access_token}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          user_id: S.session.user.id,
          name,
          lat,
          lng,
          is_active: isActive,
          accuracy: 10,
          updated_at: new Date().toISOString(),
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function placeName(p) {
    try {
      const res = await fetch(`${NOMINATIM}/reverse?lat=${p.lat}&lon=${p.lng}&format=json&zoom=17&addressdetails=0`, { headers: { "Accept-Language": "fr" } });
      const data = await res.json();
      return data.display_name ? data.display_name.split(",").slice(0, 2).join(",").trim() : null;
    } catch {
      return null;
    }
  }

  async function roadPath(from, to, profile) {
    try {
      const url = `${ROUTER}/routed-${profile}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      const coords = data.routes?.[0]?.geometry?.coordinates;
      if (coords?.length > 1) return coords.map(([lng, lat]) => ({ lat, lng }));
    } catch {}
    return [from, to];
  }

  // ── Favorites storage ──

  const places = () => load(KEYS.favorites, []);
  const routes = () => load(KEYS.routes, []);
  const homePlace = () => load(KEYS.home, null);

  function upsertPlace(place) {
    const list = places();
    const i = list.findIndex((p) => p.lat === place.lat && p.lng === place.lng);
    if (i >= 0) list[i] = place; else list.unshift(place);
    save(KEYS.favorites, list);
  }
  function deletePlace(place) {
    save(KEYS.favorites, places().filter((p) => !(p.lat === place.lat && p.lng === place.lng)));
  }
  function upsertRoute(route) {
    const list = routes();
    const i = list.findIndex((r) => r.id === route.id);
    if (i >= 0) list[i] = route; else list.unshift(route);
    save(KEYS.routes, list);
  }
  function deleteRoute(id) {
    save(KEYS.routes, routes().filter((r) => r.id !== id));
  }

  // ── Map ──

  const pinIcon = () => L.divIcon({ className: "", html: '<div class="h-pin"></div>', iconSize: [38, 46], iconAnchor: [19, 46] });

  function initMap() {
    if (map) return;
    map = L.map("map", { zoomControl: true, worldCopyJump: true }).setView([48.8566, 2.3522], 12);
    map.zoomControl.setPosition("bottomright");
    map.attributionControl.setPrefix(false);
    L.tileLayer(TILE_BASE, { maxZoom: 19, maxNativeZoom: 16, attribution: "© Esri, HERE, Garmin, © OpenStreetMap" }).addTo(map);
    L.tileLayer(TILE_LABELS, { maxZoom: 19, maxNativeZoom: 16 }).addTo(map);

    routeGlow = L.polyline([], { color: "#a855f7", weight: 11, opacity: 0.28, lineCap: "round", lineJoin: "round", interactive: false }).addTo(map);
    routeLine = L.polyline([], { color: "#ec4899", weight: 4.5, opacity: 1, lineCap: "round", lineJoin: "round", interactive: false }).addTo(map);
    trailLine = L.polyline([], { color: "#f472b6", weight: 4, dashArray: "2 8", lineCap: "round", interactive: false }).addTo(map);
    waypointLayer = L.layerGroup().addTo(map);
    favoriteLayer = L.layerGroup().addTo(map);

    map.on("click", (e) => onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }));

    const last = load(KEYS.lastPosition, null);
    if (last?.lat != null) {
      S.selected = last;
      map.setView([last.lat, last.lng], 15);
    }
  }

  function flyTo(p, zoom) {
    if (!map || !p) return;
    map.flyTo([p.lat, p.lng], zoom ?? Math.max(map.getZoom(), 15), { duration: 0.6 });
  }

  function fitPath(coords) {
    if (!map || !coords.length) return;
    if (coords.length === 1) return flyTo(coords[0], 15);
    map.flyToBounds(L.latLngBounds(coords.map((c) => [c.lat, c.lng])), { padding: [90, 90], duration: 0.6, maxZoom: 17 });
  }

  function setPin(p) {
    if (!map) return;
    if (!p) {
      if (pinMarker) { pinMarker.remove(); pinMarker = null; }
      return;
    }
    if (pinMarker) pinMarker.setLatLng([p.lat, p.lng]);
    else pinMarker = L.marker([p.lat, p.lng], { icon: pinIcon(), interactive: false, keyboard: false }).addTo(map);
  }

  function setRunnerDot(p) {
    if (!map) return;
    if (!p) {
      if (runnerMarker) { runnerMarker.remove(); runnerMarker = null; }
      return;
    }
    if (runnerMarker) runnerMarker.setLatLng([p.lat, p.lng]);
    else runnerMarker = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "", html: '<div class="h-runner"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }), interactive: false }).addTo(map);
  }

  function routePath() {
    return S.route.legs.flatMap((leg) => leg.coords);
  }

  function renderMapLayers() {
    if (!map) return;
    const onMap = S.view === "map";

    // Pin: the teleport target, or the walker.
    if (onMap && S.mode === "teleport") setPin(S.selected);
    else if (onMap && S.mode === "walk") setPin(S.walk.pos);
    else setPin(null);

    trailLine.setLatLngs(onMap && S.mode === "walk" ? S.walk.trail.map((p) => [p.lat, p.lng]) : []);

    const path = onMap && S.mode === "route" ? routePath() : [];
    routeGlow.setLatLngs(path.map((p) => [p.lat, p.lng]));
    routeLine.setLatLngs(path.map((p) => [p.lat, p.lng]));

    waypointLayer.clearLayers();
    if (onMap && S.mode === "route") {
      const pts = S.route.points;
      if (S.route.method === "draw") {
        pts.forEach((p) => L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "", html: '<div class="h-dot"></div>', iconSize: [10, 10], iconAnchor: [5, 5] }), interactive: false }).addTo(waypointLayer));
      } else {
        pts.forEach((p, i) => {
          const last = i === pts.length - 1 && i > 0;
          const label = i === 0 ? "A" : last ? "B" : String(i);
          const stop = i > 0 && !last;
          L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "", html: `<div class="h-wp ${stop ? "stop" : ""}">${label}</div>`, iconSize: [24, 24], iconAnchor: [12, 12] }), interactive: false }).addTo(waypointLayer);
        });
      }
    }

    favoriteLayer.clearLayers();
    if (S.view === "favorites") {
      places().forEach((p) => {
        L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "", html: `<div class="h-favpin">${esc(p.emoji || "📍")}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] }) })
          .on("click", () => selectPosition(p, { fly: true, view: "map" }))
          .addTo(favoriteLayer);
      });
    }

    const runnerPos = S.runner ? positionAt((Date.now() - S.runner.startedAt) / 1000, S.runner.legs, S.runner.speed) : null;
    setRunnerDot(onMap && runnerPos ? runnerPos : null);
  }

  // ── Selection ──

  function selectPosition(p, { fly = true, view } = {}) {
    const pos = { name: p.name || coordsText(p), lat: p.lat, lng: p.lng };
    S.selected = pos;
    if (view) S.view = view;
    save(KEYS.lastPosition, pos);
    if (fly) flyTo(pos);
    render();
    if (!p.name) {
      placeName(pos).then((name) => {
        if (name && S.selected?.lat === pos.lat && S.selected?.lng === pos.lng) {
          S.selected = { ...S.selected, name };
          save(KEYS.lastPosition, S.selected);
          render();
        }
      });
    }
  }

  function onMapClick(p) {
    if (S.view === "favorites") {
      S.mode = "teleport";
      selectPosition(p, { fly: false, view: "map" });
      return;
    }
    if (S.mode === "teleport") {
      selectPosition(p, { fly: false });
    } else if (S.mode === "walk") {
      if (S.walk.running) return;
      S.walk.pos = { ...p };
      S.walk.trail = [];
      render();
    } else if (S.mode === "route") {
      if (S.runner || S.route.method === "gpx") return;
      if (S.route.method === "draw") {
        addRoutePoint({ name: "Point", ...p });
      } else {
        const id = addRoutePoint({ name: coordsText(p), ...p });
        placeName(p).then((name) => {
          const pt = S.route.points.find((x) => x.id === id);
          if (name && pt) { pt.name = name; render(); }
        });
      }
    }
  }

  function setActive(loc) {
    S.active = loc ? { name: loc.name, lat: loc.lat, lng: loc.lng } : null;
    S.lastSyncAt = new Date();
    render();
  }

  // ── Teleport ──

  async function applySelected() {
    const p = S.selected;
    if (!p || S.applying) return;
    await stopMotion();
    S.applying = true;
    $("applying").hidden = false;
    const started = Date.now();
    const ok = await upsertLocation({ name: p.name, lat: p.lat, lng: p.lng, isActive: true });
    const wait = 1200 - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    $("applying").hidden = true;
    S.applying = false;
    if (ok) {
      setActive(p);
      toast(`Position appliquée : ${p.name}`);
    } else {
      render();
      toast("Impossible d'appliquer la position.", "error");
    }
  }

  async function teleportTo(p) {
    S.view = "map";
    S.mode = "teleport";
    selectPosition(p, { fly: true });
    await applySelected();
  }

  async function resetRealLocation() {
    const p = S.active || S.selected;
    if (!p) return;
    await stopMotion();
    const ok = await upsertLocation({ name: p.name, lat: p.lat, lng: p.lng, isActive: false });
    if (ok) {
      setActive(null);
      toast("Position réelle rétablie");
    } else {
      toast("Impossible de rétablir la position.", "error");
    }
  }

  async function driveHome() {
    const home = homePlace();
    const from = S.active || S.selected;
    if (!home || !from) return;
    S.mode = "route";
    S.route = { ...S.route, method: "search", points: [], legs: [], speed: "drive", gpxName: null, savedId: null };
    S.route.points = [
      { id: uid(), name: from.name || "Position actuelle", lat: from.lat, lng: from.lng, pause: 0 },
      { id: uid(), name: home.name || "Maison", lat: home.lat, lng: home.lng, pause: 0 },
    ];
    render();
    await recomputeRoute();
    await startRoute();
  }

  // ── Walk ──

  function walkKmh() {
    return SPEEDS[S.walk.speed].kmh;
  }

  function walkVector() {
    if (S.walk.stick) return S.walk.stick;
    const k = S.walk.keys;
    const x = (k.has("e") ? 1 : 0) - (k.has("w") ? 1 : 0);
    const y = (k.has("n") ? 1 : 0) - (k.has("s") ? 1 : 0);
    const len = Math.hypot(x, y);
    return len ? { x: x / len, y: y / len } : null;
  }

  function walkTick() {
    const v = walkVector();
    const pos = S.walk.pos;
    if (!v || !pos || S.mode !== "walk" || S.view !== "map") return;
    const strength = Math.min(1, Math.hypot(v.x, v.y));
    if (strength < 0.08) return;
    const meters = (walkKmh() / 3.6) * (WALK_TICK_MS / 1000) * strength;
    const heading = Math.atan2(v.x, v.y) / RAD;
    const next = offset(pos, heading, meters);
    S.walk.pos = { name: "Position de marche", ...next };
    S.walk.heading = heading;
    S.walk.trail.push(next);
    if (S.walk.trail.length > 600) S.walk.trail.shift();
    setPin(S.walk.pos);
    trailLine.addLatLng([next.lat, next.lng]);
    renderPill();
    const coordsEl = document.querySelector("#panel .h-sel-coords");
    if (coordsEl) coordsEl.textContent = coordsText(next);

    if (!S.walk.running) {
      S.walk.running = true;
      if (S.walk.trail.length === 1) S.walk.trail.unshift({ lat: pos.lat, lng: pos.lng });
      renderPanel();
    }
    const now = Date.now();
    if (now - S.walk.lastPush >= WALK_PUSH_MS) {
      S.walk.lastPush = now;
      window.anylocSetup.liveMove?.({ lat: next.lat, lng: next.lng }).then((res) => {
        if (res && !res.ok) toast(res.message || "Impossible de déplacer l'iPhone.", "error");
      });
    }
  }

  async function stopWalk() {
    if (!S.walk.running) return;
    S.walk.running = false;
    S.walk.keys.clear();
    S.walk.stick = null;
    const p = S.walk.pos;
    // Persist the final spot first so auto-sync picks it up once live mode ends.
    await upsertLocation({ name: p.name, lat: p.lat, lng: p.lng, isActive: true });
    await window.anylocSetup.stopLive?.();
    setActive(p);
    placeName(p).then((name) => {
      if (name && S.active?.lat === p.lat && S.active?.lng === p.lng) {
        S.active = { ...S.active, name };
        S.walk.pos = { ...S.walk.pos, name };
        render();
      }
    });
  }

  function setHomeFromWalk() {
    const p = S.walk.pos || S.selected;
    if (!p) return;
    save(KEYS.home, { name: p.name, lat: p.lat, lng: p.lng });
    toast("Maison enregistrée");
    render();
  }

  const KEY_DIRS = { z: "n", w: "n", arrowup: "n", s: "s", arrowdown: "s", q: "w", a: "w", arrowleft: "w", d: "e", arrowright: "e" };

  function onKey(e, down) {
    if (S.mode !== "walk" || S.view !== "map" || !$("main-screen")?.classList.contains("active")) return;
    if (e.target.closest?.("input, textarea, select") || !$("name-dialog").hidden) return;
    const dir = KEY_DIRS[e.key.toLowerCase()];
    if (!dir) return;
    e.preventDefault();
    if (down) S.walk.keys.add(dir); else S.walk.keys.delete(dir);
    document.querySelectorAll(".h-kbd [data-dir]").forEach((el) => el.classList.toggle("on", S.walk.keys.has(el.dataset.dir)));
  }

  function bindJoystick() {
    const pad = $("joystick");
    const knob = $("joystick-knob");
    const R = 50;
    let pointer = null;
    const move = (e) => {
      const rect = pad.getBoundingClientRect();
      let dx = e.clientX - (rect.left + rect.width / 2);
      let dy = e.clientY - (rect.top + rect.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      S.walk.stick = { x: dx / R, y: -dy / R };
    };
    const end = () => {
      pointer = null;
      pad.classList.remove("dragging");
      knob.style.transform = "";
      S.walk.stick = null;
    };
    pad.addEventListener("pointerdown", (e) => {
      if (!S.walk.pos) { toast("Choisis d'abord un point de départ sur la carte.", "error"); return; }
      pointer = e.pointerId;
      pad.setPointerCapture(pointer);
      pad.classList.add("dragging");
      move(e);
    });
    pad.addEventListener("pointermove", (e) => { if (e.pointerId === pointer) move(e); });
    pad.addEventListener("pointerup", end);
    pad.addEventListener("pointercancel", end);
  }

  // ── Route ──

  function routeKmh(r = S.route) {
    return SPEEDS[r.speed].kmh ?? r.customKmh;
  }
  function legsDistance(legs) {
    return legs.reduce((sum, leg) => sum + pathLength(leg.coords), 0);
  }
  function legsDuration(legs, kmh) {
    return legsDistance(legs) / (kmh / 3.6) + legs.reduce((sum, leg) => sum + leg.pauseAfter, 0);
  }

  function addRoutePoint(p) {
    const id = uid();
    S.route.points.push({ id, name: p.name, lat: p.lat, lng: p.lng, pause: 0 });
    void recomputeRoute();
    return id;
  }

  async function recomputeRoute() {
    const r = S.route;
    const seq = ++computeSeq;
    if (r.method === "gpx") { render(); return; }
    if (r.points.length < 2) { r.legs = []; r.computing = false; render(); return; }
    if (r.method === "draw") {
      r.legs = [{ coords: r.points.map(({ lat, lng }) => ({ lat, lng })), pauseAfter: 0 }];
      render();
      fitPath(routePath());
      return;
    }
    r.computing = true;
    render();
    const profile = SPEEDS[r.speed].profile || (r.customKmh > 25 ? "car" : "foot");
    const legs = [];
    for (let i = 1; i < r.points.length; i++) {
      const from = r.points[i - 1];
      const to = r.points[i];
      const coords = await roadPath(from, to, profile);
      if (seq !== computeSeq) return;
      legs.push({ coords, pauseAfter: i === r.points.length - 1 ? 0 : to.pause * 60 });
    }
    r.legs = legs;
    r.computing = false;
    render();
    fitPath(routePath());
  }

  function setRouteMethod(method) {
    if (S.route.method === method) return;
    S.route = { ...S.route, method, points: [], legs: [], gpxName: null, savedId: null, computing: false };
    computeSeq++;
    render();
    if (method === "gpx") pickGpx();
  }

  function pickGpx() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".gpx,application/gpx+xml,application/xml,text/xml";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const coords = parseGpx(await file.text());
      if (coords.length < 2) { toast("Ce fichier GPX ne contient pas de trajet.", "error"); return; }
      S.route = {
        ...S.route,
        method: "gpx",
        gpxName: file.name.replace(/\.gpx$/i, ""),
        points: [
          { id: uid(), name: "Départ", ...coords[0], pause: 0 },
          { id: uid(), name: "Arrivée", ...coords[coords.length - 1], pause: 0 },
        ],
        legs: [{ coords, pauseAfter: 0 }],
        savedId: null,
      };
      render();
      fitPath(coords);
    });
    input.click();
  }

  function parseGpx(text) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const read = (tag) => [...doc.getElementsByTagName(tag)]
      .map((el) => ({ lat: parseFloat(el.getAttribute("lat")), lng: parseFloat(el.getAttribute("lon")) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    const track = read("trkpt");
    if (track.length) return track;
    const route = read("rtept");
    return route.length ? route : read("wpt");
  }

  /** Timed GPX for pymobiledevice3 `simulate-location play`: one point every ~0.5 s (iOS does not interpolate between points). */
  function buildGpx(legs, speed) {
    const pts = [];
    let t = Date.now();
    const push = (p) => pts.push(`<trkpt lat="${p.lat.toFixed(7)}" lon="${p.lng.toFixed(7)}"><time>${new Date(t).toISOString()}</time></trkpt>`);
    const step = Math.max(speed * 0.5, 1);
    push(legs[0].coords[0]);
    for (const leg of legs) {
      for (let i = 1; i < leg.coords.length; i++) {
        const a = leg.coords[i - 1];
        const b = leg.coords[i];
        const d = distance(a, b);
        const parts = Math.max(1, Math.ceil(d / step));
        for (let k = 1; k <= parts; k++) {
          t += (d / parts / speed) * 1000;
          push({ lat: a.lat + ((b.lat - a.lat) * k) / parts, lng: a.lng + ((b.lng - a.lng) * k) / parts });
        }
      }
      if (leg.pauseAfter > 0) {
        t += leg.pauseAfter * 1000;
        push(leg.coords[leg.coords.length - 1]);
      }
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Anyloc" xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg>${pts.join("")}</trkseg></trk></gpx>`;
  }

  function routeName() {
    const saved = routes().find((r) => r.id === S.route.savedId);
    if (saved) return saved.name;
    if (S.route.gpxName) return S.route.gpxName;
    const last = S.route.points[S.route.points.length - 1];
    return last ? `Vers ${last.name}` : "Trajet";
  }

  async function startRoute() {
    const r = S.route;
    if (r.legs.length === 0 || r.computing) return;
    await stopMotion();
    const speed = routeKmh() / 3.6;
    const res = await window.anylocSetup.playRoute?.({ gpx: buildGpx(r.legs, speed) });
    if (res && !res.ok) { toast(res.message || "Impossible de lancer le trajet.", "error"); return; }
    const legs = r.legs.map((leg) => ({ coords: leg.coords, pauseAfter: leg.pauseAfter }));
    const last = r.points[r.points.length - 1] || legs[legs.length - 1].coords.slice(-1)[0];
    S.runner = {
      name: routeName(),
      legs,
      speed,
      total: legsDuration(legs, routeKmh()),
      startedAt: Date.now(),
      dest: { name: last.name || "Arrivée", ...legs[legs.length - 1].coords.slice(-1)[0] },
    };
    S.mode = "route";
    S.view = "map";
    render();
    runnerTimer = setInterval(runnerTick, 500);
    runnerTick();
  }

  function runnerTick() {
    const run = S.runner;
    if (!run) return;
    const elapsed = Math.min((Date.now() - run.startedAt) / 1000, run.total);
    const pos = positionAt(elapsed, run.legs, run.speed);
    if (S.view === "map") setRunnerDot(pos);
    const pct = run.total ? elapsed / run.total : 1;
    const bar = $("h-run-bar");
    if (bar) bar.style.width = `${(pct * 100).toFixed(1)}%`;
    const pctEl = $("h-run-pct");
    if (pctEl) pctEl.textContent = `${Math.floor(pct * 100)} %`;
    const left = $("h-run-left");
    if (left) left.textContent = `Reste ${formatDuration(run.total - elapsed)}`;
    renderPill();
    if (elapsed >= run.total) void finishRoute(run.dest, "Trajet terminé");
  }

  async function finishRoute(at, message) {
    clearInterval(runnerTimer);
    runnerTimer = null;
    S.runner = null;
    await upsertLocation({ name: at.name, lat: at.lat, lng: at.lng, isActive: true });
    await window.anylocSetup.stopLive?.();
    setRunnerDot(null);
    setActive(at);
    if (message) toast(message);
  }

  async function stopRoute() {
    const run = S.runner;
    if (!run) return;
    const pos = positionAt((Date.now() - run.startedAt) / 1000, run.legs, run.speed);
    await finishRoute({ name: `${run.name} (arrêté)`, ...pos }, "Trajet arrêté");
  }

  /** Ends any walk or route playback so a new action starts from a clean state. */
  async function stopMotion() {
    if (S.walk.running) await stopWalk();
    if (S.runner) await stopRoute();
  }

  function saveCurrentRoute() {
    const existing = routes().find((r) => r.id === S.route.savedId);
    openNameDialog({
      title: existing ? "Mettre à jour le trajet" : "Enregistrer le trajet",
      name: existing?.name || routeName(),
      emoji: existing?.emoji || "🚶",
      onSave: (name, emoji) => {
        const r = S.route;
        const route = {
          id: existing?.id || uid(),
          name,
          emoji,
          method: r.method,
          points: r.points,
          legs: r.legs,
          speed: r.speed,
          customKmh: r.customKmh,
        };
        upsertRoute(route);
        S.route.savedId = route.id;
        toast("Trajet enregistré");
        render();
      },
    });
  }

  async function launchSaved(id) {
    const saved = routes().find((r) => r.id === id);
    if (!saved) return;
    S.view = "map";
    S.mode = "route";
    S.route = {
      method: saved.method,
      points: saved.points.map((p) => ({ ...p })),
      legs: saved.legs,
      speed: saved.speed,
      customKmh: saved.customKmh,
      computing: false,
      gpxName: saved.method === "gpx" ? saved.name : null,
      savedId: saved.id,
    };
    render();
    fitPath(routePath());
    await startRoute();
  }

  // ── Name + emoji dialog ──

  let dialogSave = null;
  function openNameDialog({ title, name, emoji, onSave }) {
    $("name-dialog-title").textContent = title;
    $("name-dialog-input").value = name || "";
    $("name-dialog-emoji").textContent = emoji;
    $("name-dialog-emojis").innerHTML = EMOJIS.map((e) => `<button type="button" data-emoji="${e}" class="${e === emoji ? "on" : ""}">${e}</button>`).join("");
    dialogSave = onSave;
    $("name-dialog").hidden = false;
    setTimeout(() => $("name-dialog-input").select(), 30);
  }
  function closeNameDialog() {
    $("name-dialog").hidden = true;
    dialogSave = null;
  }

  function addFavorite(p) {
    if (!p) return;
    const existing = places().find((f) => f.lat === p.lat && f.lng === p.lng);
    openNameDialog({
      title: existing ? "Modifier le favori" : "Ajouter aux favoris",
      name: existing?.name || p.name,
      emoji: existing?.emoji || "📍",
      onSave: (name, emoji) => {
        upsertPlace({ name, lat: p.lat, lng: p.lng, emoji });
        toast(existing ? "Favori modifié" : "Ajouté aux favoris");
        render();
      },
    });
  }

  // ── Rendering ──

  function render() {
    if (!$("panel")) return;
    document.querySelectorAll(".h-rail-btn").forEach((b) => {
      const rail = b.dataset.rail;
      const on = rail === "account" ? !$("account-view").hidden
        : $("account-view").hidden && (rail === "favorites" ? S.view === "favorites" : S.view === "map" && (rail === "route") === (S.mode === "route"));
      b.classList.toggle("active", on);
    });
    const showSearch = S.view === "favorites" || (!S.runner && !(S.mode === "route" && S.route.method !== "search") && !(S.mode === "walk" && S.walk.running));
    $("h-search").hidden = !showSearch;
    if (!showSearch) $("search-results").hidden = true;
    $("search-input").placeholder = S.mode === "route" && S.view === "map" ? "Ajouter un lieu au trajet" : "Rechercher une ville, une adresse, un lieu";
    $("joystick").hidden = !(S.view === "map" && S.mode === "walk");
    renderPanel();
    renderMapLayers();
    renderPill();
  }

  function renderPill() {
    const pill = $("map-pill");
    if (!pill) return;
    let html = "";
    if (S.view === "map") {
      if (S.runner) {
        const run = S.runner;
        const pct = Math.floor(Math.min(1, (Date.now() - run.startedAt) / 1000 / run.total) * 100);
        html = `<span class="live"></span><span class="name">${esc(run.name)}</span><span class="m">· ${pct} %</span>`;
      } else if (S.mode === "walk" && S.walk.pos) {
        html = S.walk.running
          ? `<span class="live"></span>Marche <span class="m">· ${walkKmh()} km/h · cap ${compass(S.walk.heading)}</span>`
          : `${I.walk}<span class="name">${esc(S.walk.pos.name || coordsText(S.walk.pos))}</span>`;
      } else if (S.mode === "route" && S.route.legs.length) {
        const pts = S.route.points;
        const title = S.route.method === "gpx" ? S.route.gpxName
          : S.route.method === "draw" ? `Tracé · ${pts.length} points`
          : `${pts[0].name} → ${pts[pts.length - 1].name}`;
        html = `${I.route}<span class="name">${esc(title)}</span><span class="m">· ${formatDistance(legsDistance(S.route.legs))} · ${formatDuration(legsDuration(S.route.legs, routeKmh()))}</span>`;
      } else if (S.mode === "teleport" && S.selected) {
        html = `${I.nav}<span class="name">${esc(S.selected.name)}</span>`;
      }
    }
    pill.innerHTML = html;
    pill.hidden = !html;
  }

  function deviceHtml() {
    const { connected, name } = S.usb;
    return `<div class="h-card">
      <div class="h-cap">Appareil</div>
      <div class="h-dev-row"><span class="h-dev-dot ${connected ? "" : "off"}"></span>${connected ? "<b>Connecté</b>" : '<span class="off">Non connecté</span>'}<span style="color:#55555d">·</span><span class="name">${esc(connected ? name || "iPhone" : "Branche ton iPhone en USB")}</span></div>
      <div class="h-dev-row">${I.crosshair}<span>GPS simulé : ${S.active || S.walk.running || S.runner ? "<b>actif</b>" : "inactif"}</span></div>
      <div class="h-dev-row">${I.clock}<span id="h-sync">${formatSync(S.lastSyncAt)}</span></div>
    </div>`;
  }

  function renderDevice() {
    const el = $("h-dev");
    if (el) el.innerHTML = deviceHtml();
  }

  function selectedCard(p, emptyText) {
    if (!p) return `<div class="h-cap">Position choisie</div><p class="h-hint" style="margin-top:10px">${emptyText}</p>`;
    return `<div class="h-cap">Position choisie</div>
      <div class="h-card h-sel"><div class="h-sel-ico">${I.pin}</div><div><div class="h-sel-name">${esc(p.name)}</div><div class="h-sel-coords mono">${coordsText(p)}</div></div></div>`;
  }

  function teleportHtml() {
    const p = S.selected;
    const isFav = p && places().some((f) => f.lat === p.lat && f.lng === p.lng);
    const home = homePlace();
    const canHome = Boolean(home && (S.active || p));
    return `
      <div class="h-block">${selectedCard(p, "Clique sur la carte ou cherche un lieu.")}</div>
      <div class="h-block nb">
        <button class="h-btn h-btn-out" data-action="favorite" ${p ? "" : "disabled"} style="margin-top:0">${I.star}${isFav ? "Modifier le favori" : "Ajouter aux favoris"}</button>
        <button class="h-btn h-btn-ghost" data-action="drive-home" ${canHome ? "" : "disabled"} title="${home ? "" : "Définis ta maison en mode Marche"}">${I.home}Rentrer à la maison</button>
        <button class="h-btn h-btn-grad" data-action="apply" ${p && !S.applying ? "" : "disabled"}>${I.crosshair}Appliquer la position</button>
        ${S.active ? `<button class="h-link" data-action="reset">Revenir à ma vraie position</button>` : ""}
      </div>`;
  }

  function walkHtml() {
    const w = S.walk;
    const chips = ["walk", "bike", "drive"].map((k) =>
      `<button class="h-chip ${w.speed === k ? "on" : ""}" data-action="walk-speed" data-speed="${k}">${SPEEDS[k].label}<small>${SPEEDS[k].kmh} km/h</small></button>`).join("");
    const key = (dir, label) => `<span data-dir="${dir}" class="${w.keys.has(dir) ? "on" : ""}">${label}</span>`;
    return `
      <div class="h-block">${selectedCard(w.pos, "Clique sur la carte pour choisir ton point de départ.")}</div>
      <div class="h-block"><div class="h-chips">${chips}</div></div>
      <div class="h-block">
        <div class="h-kbd"><span class="e"></span>${key("n", "Z")}<span class="e"></span>${key("w", "Q")}${key("s", "S")}${key("e", "D")}</div>
        <p class="h-hint h-center">ZQSD, WASD, flèches ou joystick</p>
      </div>
      <div class="h-block nb">
        <div class="h-two">
          <button class="h-btn h-btn-ghost" data-action="set-home" ${w.pos ? "" : "disabled"} style="margin-top:0">${I.home}Définir maison</button>
          <button class="h-btn h-btn-out" data-action="favorite-walk" ${w.pos ? "" : "disabled"} style="margin-top:0">${I.star}Favori</button>
        </div>
        ${w.running ? `<button class="h-btn h-btn-stop" data-action="stop-walk">${I.stop}Arrêter la marche</button>` : ""}
      </div>`;
  }

  function routeHtml() {
    if (S.runner) {
      const run = S.runner;
      return `
        <div class="h-block nb">
          <div class="h-cap accent">Trajet en cours</div>
          <div class="h-sel-name" style="margin-top:8px">${esc(run.name)}</div>
          <div class="h-bar"><i id="h-run-bar" style="width:0%"></i></div>
          <div class="h-sum"><b id="h-run-pct">0 %</b><span id="h-run-left"></span></div>
          <p class="h-hint" style="margin-top:12px">L'ordinateur rejoue le trajet sur l'iPhone. Garde-le branché.</p>
          <button class="h-btn h-btn-stop" data-action="stop-route">${I.stop}Arrêter le trajet</button>
        </div>`;
    }
    const r = S.route;
    const methods = [["search", "Recherche", I.search], ["draw", "Dessin", I.pencil], ["gpx", "Import GPX", I.file]]
      .map(([m, label, icon]) => `<button class="h-method ${r.method === m ? "on" : ""}" data-action="method" data-method="${m}">${icon}${label}</button>`).join("");

    let content = "";
    if (r.method === "search") {
      if (!r.points.length) {
        content = `<p class="h-hint" style="margin-top:12px">Cherche un lieu ou clique sur la carte pour ajouter le départ, puis les étapes.</p>`;
      } else {
        content = `<div class="h-wps">${r.points.map((p, i) => {
          const last = i === r.points.length - 1 && i > 0;
          const first = i === 0;
          const stop = !first && !last;
          return `<div class="h-wpr"><div class="d ${stop ? "s" : ""}">${first ? "A" : last ? "B" : i}</div>
            <div class="b"><div class="t"><div class="n">${esc(p.name)}</div><div class="s2">${first ? "Départ" : last ? "Arrivée" : "Étape"}</div></div>
            ${stop ? `<button class="h-pause" data-action="pause" data-id="${p.id}">${p.pause ? `⏸ ${p.pause} min` : "+ pause"}</button>` : ""}
            <button class="h-x" data-action="remove-point" data-id="${p.id}" title="Retirer">${I.x}</button></div></div>`;
        }).join("")}</div>`;
      }
      content += `<button class="h-add" data-action="add-stop" ${r.points.length ? "" : 'style="padding-left:0"'}>${I.plus}${r.points.length ? "Ajouter une étape" : "Ajouter le départ"}</button>`;
    } else if (r.method === "draw") {
      content = `<p class="h-hint" style="margin-top:12px">Clique sur la carte pour tracer ton trajet point par point.</p>
        <div class="h-mini-row"><b>${r.points.length} point${r.points.length > 1 ? "s" : ""}</b>
          <button class="h-small" data-action="undo-point" ${r.points.length ? "" : "disabled"}>${I.undo}Annuler</button>
          <button class="h-small" data-action="clear-points" ${r.points.length ? "" : "disabled"}>${I.trash}Effacer</button></div>`;
    } else {
      const count = r.legs[0]?.coords.length || 0;
      content = `<div class="h-mini-row" style="margin-top:12px"><div class="h-sel-ico">${I.file}</div>
        <div style="flex:1;min-width:0"><div class="h-sel-name">${esc(r.gpxName || "Aucun fichier")}</div><div class="h-hint">${r.gpxName ? `${count} points` : "Importe un fichier .gpx"}</div></div>
        <button class="h-small" data-action="pick-gpx">${I.import}${r.gpxName ? "Changer" : "Importer"}</button></div>`;
    }

    const chips = ["walk", "bike", "drive"].map((k) =>
      `<button class="h-chip ${r.speed === k ? "on" : ""}" data-action="route-speed" data-speed="${k}">${SPEEDS[k].label}<small>${SPEEDS[k].kmh} km/h</small></button>`).join("");
    const custom = `<label class="h-chip ${r.speed === "custom" ? "on" : ""}" data-action="route-speed" data-speed="custom">Perso<small><select data-role="custom-speed">${CUSTOM_SPEEDS.map((v) => `<option value="${v}" ${v === r.customKmh ? "selected" : ""}>${v} km/h</option>`).join("")}</select></small></label>`;

    const dist = legsDistance(r.legs);
    const canStart = r.legs.length > 0 && !r.computing;
    return `
      <div class="h-block">${`<div class="h-methods">${methods}</div>`}${content}</div>
      <div class="h-block"><div class="h-chips">${chips}${custom}</div></div>
      <div class="h-block nb">
        <div class="h-sum"><span>Distance <b>${dist ? formatDistance(dist) : "—"}</b></span><span>Durée <b>${dist ? formatDuration(legsDuration(r.legs, routeKmh())) : "—"}</b></span></div>
        <div class="h-two" style="margin-top:4px">
          <button class="h-btn h-btn-out" data-action="save-route" ${canStart ? "" : "disabled"} style="flex:0 0 52px;height:52px;margin-top:14px" title="Enregistrer">${I.bookmark}</button>
          <button class="h-btn h-btn-grad" data-action="start-route" ${canStart ? "" : "disabled"}>${r.computing ? "Calcul de l'itinéraire…" : `${I.play}Lancer le trajet`}</button>
        </div>
      </div>`;
  }

  function favoritesHtml() {
    const f = S.fav;
    const tabs = [["places", `Lieux · ${places().length}`], ["routes", `Trajets · ${routes().length}`], ["discover", "Découvrir"]]
      .map(([k, label]) => `<button class="${f.tab === k ? "on" : ""}" data-action="fav-tab" data-tab="${k}">${label}</button>`).join("");
    const cats = f.tab === "discover"
      ? `<div class="h-cats">${SPOT_CATEGORIES.map((c) => `<button class="${f.cat === c.id ? "on" : ""}" data-action="fav-cat" data-cat="${c.id}">${c.label}</button>`).join("")}</div>`
      : "";
    return `
      <div class="h-block" style="padding-top:22px">
        <div class="h-fav-head"><h2>Favoris</h2><button class="h-plus" data-action="favorite" ${S.selected ? "" : "disabled"} title="Ajouter la position choisie">${I.plus}</button></div>
        <div class="h-seg">${tabs}</div>
        <div class="h-filter">${I.search}<input data-role="fav-filter" type="text" placeholder="Filtrer" value="${esc(f.filter)}" /></div>
        ${cats}
      </div>
      <div class="h-list" id="h-list">${favoritesListHtml()}</div>
      <div class="h-block nb" style="border-top:1px solid var(--h-line)">
        <button class="h-btn h-btn-out" data-action="favorite" ${S.selected ? "" : "disabled"} style="margin-top:0">${I.star}Ajouter la position choisie</button>
      </div>`;
  }

  function favoritesListHtml() {
    const f = S.fav;
    const q = f.filter.trim().toLowerCase();
    const match = (name) => !q || name.toLowerCase().includes(q);
    if (f.tab === "places") {
      const list = places().filter((p) => match(p.name));
      if (!list.length) return `<div class="h-empty"><b>${q ? "Aucun résultat" : "Aucun lieu enregistré"}</b>${q ? "" : "Ajoute un lieu avec l'étoile, depuis le mode Téléporter."}</div>`;
      return list.map((p) => `<div class="h-fav" data-action="fav-preview" data-lat="${p.lat}" data-lng="${p.lng}">
        <div class="h-emo">${esc(p.emoji || "📍")}</div>
        <div class="t"><div class="n">${esc(p.name)}</div><div class="s2 mono">${coordsText(p)}</div></div>
        <button class="h-mini" data-action="fav-edit" data-lat="${p.lat}" data-lng="${p.lng}" title="Modifier">${I.edit}</button>
        <button class="h-mini" data-action="fav-delete" data-lat="${p.lat}" data-lng="${p.lng}" title="Supprimer">${I.trash}</button>
        <button class="h-act" data-action="fav-go" data-lat="${p.lat}" data-lng="${p.lng}">${I.nav}Téléporter</button></div>`).join("");
    }
    if (f.tab === "routes") {
      const list = routes().filter((r) => match(r.name));
      if (!list.length) return `<div class="h-empty"><b>${q ? "Aucun résultat" : "Aucun trajet enregistré"}</b>${q ? "" : "Crée un trajet puis enregistre-le avec le signet."}</div>`;
      return list.map((r) => {
        const stops = Math.max(r.points.length - 2, 0);
        const detail = [r.method === "gpx" ? "GPX" : `${stops} étape${stops > 1 ? "s" : ""}`, SPEEDS[r.speed].label, formatDuration(legsDuration(r.legs, routeKmh(r)))].join(" · ");
        return `<div class="h-fav">
          <div class="h-emo">${esc(r.emoji)}</div>
          <div class="t"><div class="n">${esc(r.name)}<span class="h-tag">Trajet</span></div><div class="s2">${detail}</div></div>
          <button class="h-mini" data-action="route-edit" data-id="${r.id}" title="Modifier">${I.edit}</button>
          <button class="h-mini" data-action="route-delete" data-id="${r.id}" title="Supprimer">${I.trash}</button>
          <button class="h-act" data-action="route-launch" data-id="${r.id}">${I.play}Lancer</button></div>`;
      }).join("");
    }
    const list = SPOTS.filter((s) => (f.cat === "all" || s.category === f.cat) && match(s.name));
    if (!list.length) return `<div class="h-empty"><b>Aucun résultat</b></div>`;
    return list.map((s) => `<div class="h-fav" data-action="fav-preview" data-lat="${s.lat}" data-lng="${s.lng}" data-name="${esc(s.name)}">
      <div class="h-emo">${s.emoji}</div>
      <div class="t"><div class="n">${esc(s.name)}</div><div class="s2">${esc(s.country)}</div></div>
      <button class="h-act" data-action="spot-go" data-name="${esc(s.name)}">${I.nav}Téléporter</button></div>`).join("");
  }

  function renderPanel() {
    const panel = $("panel");
    if (!panel) return;
    const scroll = panel.scrollTop;
    if (S.view === "favorites") {
      panel.innerHTML = favoritesHtml();
    } else {
      const modes = [["teleport", "Téléporter", I.nav], ["walk", "Marche", I.walk], ["route", "Trajet", I.route]]
        .map(([m, label, icon]) => `<button class="h-mode ${S.mode === m ? "on" : ""}" data-action="mode" data-mode="${m}">${icon}${label}</button>`).join("");
      const body = S.mode === "walk" ? walkHtml() : S.mode === "route" ? routeHtml() : teleportHtml();
      panel.innerHTML = `<div class="h-block" id="h-dev">${deviceHtml()}</div><div class="h-block"><div class="h-modes">${modes}</div></div>${body}`;
    }
    panel.scrollTop = scroll;
    if (S.runner) runnerTick();
  }

  // ── Panel actions ──

  const findPlace = (el) => places().find((p) => p.lat === parseFloat(el.dataset.lat) && p.lng === parseFloat(el.dataset.lng));

  const ACTIONS = {
    mode: (el) => setMode(el.dataset.mode),
    favorite: () => addFavorite(S.selected),
    "favorite-walk": () => addFavorite(S.walk.pos),
    apply: () => applySelected(),
    reset: () => resetRealLocation(),
    "drive-home": () => driveHome(),
    "walk-speed": (el) => { S.walk.speed = el.dataset.speed; render(); },
    "set-home": () => setHomeFromWalk(),
    "stop-walk": () => stopWalk(),
    method: (el) => setRouteMethod(el.dataset.method),
    pause: (el) => {
      const p = S.route.points.find((x) => x.id === el.dataset.id);
      if (!p) return;
      p.pause = PAUSE_STEPS[(PAUSE_STEPS.indexOf(p.pause) + 1) % PAUSE_STEPS.length];
      void recomputeRoute();
    },
    "remove-point": (el) => {
      S.route.points = S.route.points.filter((x) => x.id !== el.dataset.id);
      void recomputeRoute();
    },
    "add-stop": () => $("search-input").focus(),
    "undo-point": () => { S.route.points.pop(); void recomputeRoute(); },
    "clear-points": () => { S.route.points = []; void recomputeRoute(); },
    "pick-gpx": () => pickGpx(),
    "route-speed": (el) => {
      const speed = el.dataset.speed;
      const profileChanged = SPEEDS[speed].profile !== SPEEDS[S.route.speed].profile;
      S.route.speed = speed;
      if (profileChanged && S.route.method === "search") void recomputeRoute(); else render();
    },
    "save-route": () => saveCurrentRoute(),
    "start-route": () => startRoute(),
    "stop-route": () => stopRoute(),
    "fav-tab": (el) => { S.fav.tab = el.dataset.tab; S.fav.filter = ""; render(); },
    "fav-cat": (el) => { S.fav.cat = el.dataset.cat; renderPanel(); },
    "fav-preview": (el) => {
      const lat = parseFloat(el.dataset.lat);
      const lng = parseFloat(el.dataset.lng);
      flyTo({ lat, lng }, 14);
    },
    "fav-go": (el) => { const p = findPlace(el); if (p) void teleportTo(p); },
    "fav-edit": (el) => { const p = findPlace(el); if (p) addFavorite(p); },
    "fav-delete": (el) => { const p = findPlace(el); if (p) { deletePlace(p); render(); toast("Favori supprimé"); } },
    "spot-go": (el) => { const s = SPOTS.find((x) => x.name === el.dataset.name); if (s) void teleportTo(s); },
    "route-launch": (el) => launchSaved(el.dataset.id),
    "route-delete": (el) => { deleteRoute(el.dataset.id); if (S.route.savedId === el.dataset.id) S.route.savedId = null; render(); toast("Trajet supprimé"); },
    "route-edit": (el) => {
      const r = routes().find((x) => x.id === el.dataset.id);
      if (!r) return;
      openNameDialog({ title: "Modifier le trajet", name: r.name, emoji: r.emoji, onSave: (name, emoji) => { upsertRoute({ ...r, name, emoji }); render(); } });
    },
  };

  async function setMode(mode) {
    if (mode === S.mode && S.view === "map") return;
    if (S.mode === "walk" && mode !== "walk") await stopWalk();
    S.view = "map";
    S.mode = mode;
    if (mode === "walk" && !S.walk.pos) {
      const start = S.active || S.selected;
      if (start) S.walk.pos = { ...start };
    }
    if (mode === "walk") S.walk.trail = [];
    render();
    if (mode === "walk") flyTo(S.walk.pos);
    if (mode === "route" && S.route.legs.length) fitPath(routePath());
    if (mode === "teleport") flyTo(S.selected);
  }

  function onRail(rail) {
    $("account-view").hidden = rail !== "account";
    if (rail === "account") { render(); return; }
    if (rail === "favorites") { S.view = "favorites"; render(); return; }
    void setMode(rail === "route" ? "route" : S.mode === "route" ? "teleport" : S.mode);
    if (S.view !== "map") { S.view = "map"; render(); }
  }

  // ── Search ──

  function onSearchInput(query) {
    clearTimeout(searchTimer);
    $("search-clear").hidden = !query;
    if (!query || query.trim().length < 2) { $("search-results").hidden = true; return; }
    searchTimer = setTimeout(async () => {
      try {
        const res = await fetch(`${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=0`, { headers: { "Accept-Language": "fr" } });
        const results = await res.json();
        const box = $("search-results");
        if (!results.length) { box.hidden = true; return; }
        box.innerHTML = results.map((r) => {
          const name = r.display_name.split(",").slice(0, 3).join(",").trim();
          return `<button class="h-result" data-lat="${r.lat}" data-lng="${r.lon}" data-name="${esc(name)}">${I.pin}<span>${esc(name)}</span></button>`;
        }).join("");
        box.hidden = false;
      } catch {}
    }, 350);
  }

  function clearSearch() {
    $("search-input").value = "";
    $("search-clear").hidden = true;
    $("search-results").hidden = true;
  }

  function onSearchPick(el) {
    const p = { name: el.dataset.name, lat: parseFloat(el.dataset.lat), lng: parseFloat(el.dataset.lng) };
    clearSearch();
    $("search-input").blur();
    if (S.view === "map" && S.mode === "route") {
      if (S.route.method !== "search") setRouteMethod("search");
      addRoutePoint(p);
    } else if (S.view === "map" && S.mode === "walk") {
      S.walk.pos = p;
      S.walk.trail = [];
      flyTo(p);
      render();
    } else {
      S.mode = "teleport";
      selectPosition(p, { fly: true, view: "map" });
    }
  }

  // ── USB + sync ──

  async function refreshUsb() {
    try {
      const res = await window.anylocSetup.checkUsb();
      const next = { connected: Boolean(res?.connected), name: res?.deviceName || null };
      if (next.connected !== S.usb.connected || next.name !== S.usb.name) {
        S.usb = next;
        renderDevice();
      }
    } catch {}
  }

  function onAutoSync(status) {
    if (status.error) { toast(status.message, "error"); return; }
    if (!status.message) return;
    S.lastSyncAt = new Date();
    const loc = status.location;
    if (loc?.is_active) {
      const next = { name: loc.name || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`, lat: loc.lat, lng: loc.lng };
      const changed = !S.active || S.active.lat !== next.lat || S.active.lng !== next.lng;
      S.active = next;
      // A location chosen on the iPhone shows up here too.
      if (changed && S.mode === "teleport" && !S.walk.running && !S.runner) {
        S.selected = next;
        save(KEYS.lastPosition, next);
        if (S.view === "map") flyTo(next, 14);
      }
    } else if (loc && !loc.is_active) {
      S.active = null;
    }
    render();
  }

  // ── Lifecycle ──

  function bindListeners() {
    if (listenersBound) return;
    listenersBound = true;

    document.querySelectorAll(".h-rail-btn").forEach((b) => b.addEventListener("click", () => onRail(b.dataset.rail)));

    const panel = $("panel");
    panel.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el || el.disabled || e.target.closest("select")) return;
      const run = ACTIONS[el.dataset.action];
      if (run) void run(el);
    });
    panel.addEventListener("change", (e) => {
      if (e.target.dataset.role === "custom-speed") {
        S.route.customKmh = parseInt(e.target.value, 10);
        const profileChanged = S.route.speed !== "custom";
        S.route.speed = "custom";
        if (profileChanged && S.route.method === "search") void recomputeRoute(); else render();
      }
    });
    panel.addEventListener("input", (e) => {
      if (e.target.dataset.role === "fav-filter") {
        S.fav.filter = e.target.value;
        $("h-list").innerHTML = favoritesListHtml();
      }
    });

    $("search-input").addEventListener("input", (e) => onSearchInput(e.target.value));
    $("search-input").addEventListener("keydown", (e) => {
      if (e.key === "Escape") { $("search-results").hidden = true; e.target.blur(); }
      if (e.key === "Enter") { const first = $("search-results").querySelector(".h-result"); if (first) onSearchPick(first); }
    });
    $("search-clear").addEventListener("click", clearSearch);
    $("search-results").addEventListener("click", (e) => {
      const item = e.target.closest(".h-result");
      if (item) onSearchPick(item);
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#h-search") && !e.target.closest("#search-results")) $("search-results").hidden = true;
    });

    $("map-recenter").addEventListener("click", () => {
      if (S.runner) return flyTo(positionAt((Date.now() - S.runner.startedAt) / 1000, S.runner.legs, S.runner.speed));
      if (S.mode === "route" && S.route.legs.length) return fitPath(routePath());
      if (S.mode === "walk") return flyTo(S.walk.pos);
      flyTo(S.selected || S.active);
    });

    $("name-dialog-emojis").addEventListener("click", (e) => {
      const b = e.target.closest("[data-emoji]");
      if (!b) return;
      $("name-dialog-emoji").textContent = b.dataset.emoji;
      $("name-dialog-emojis").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    });
    $("name-dialog-cancel").addEventListener("click", closeNameDialog);
    $("name-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("name-dialog-input").value.trim();
      if (!name || !dialogSave) return;
      dialogSave(name, $("name-dialog-emoji").textContent);
      closeNameDialog();
    });
    $("name-dialog").addEventListener("keydown", (e) => { if (e.key === "Escape") closeNameDialog(); });

    window.addEventListener("keydown", (e) => onKey(e, true));
    window.addEventListener("keyup", (e) => onKey(e, false));
    window.addEventListener("blur", () => { S.walk.keys.clear(); });
    bindJoystick();
  }

  function enter(session) {
    S.session = session;
    bindListeners();
    initMap();
    $("account-view").hidden = true;
    render();
    setTimeout(() => map.invalidateSize(), 50);
    if (S.selected) flyTo(S.selected, 15);

    clearInterval(usbTimer);
    void refreshUsb();
    usbTimer = setInterval(refreshUsb, 3000);
    clearInterval(syncTimer);
    syncTimer = setInterval(() => { const el = $("h-sync"); if (el) el.textContent = formatSync(S.lastSyncAt); }, 5000);
    clearInterval(walkTimer);
    walkTimer = setInterval(walkTick, WALK_TICK_MS);
  }

  async function leave() {
    clearInterval(usbTimer);
    clearInterval(syncTimer);
    clearInterval(walkTimer);
    usbTimer = syncTimer = walkTimer = null;
    if (S.walk.running) { S.walk.running = false; await window.anylocSetup.stopLive?.(); }
    if (S.runner) { clearInterval(runnerTimer); runnerTimer = null; S.runner = null; await window.anylocSetup.stopLive?.(); }
  }

  function reset() {
    S.active = null;
    S.lastSyncAt = null;
    S.usb = { connected: false, name: null };
  }

  window.homeEnter = enter;
  window.homeLeave = leave;
  window.homeReset = reset;
  window.homeOnAutoSync = onAutoSync;
  window.homeSetActive = setActive;
  window.upsertLocation = upsertLocation;
  window.showToast = (message, type) => toast(message, type === "error" ? "error" : "ok");
})();
