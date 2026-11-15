// Install steps sent to anyloc.io (/api/app-event), where they land in PostHog:
// before login on this install, then on the logged-in user. Shows where the
// install leaks between the download and the first location applied.
// Never put the email, the iPhone name or coordinates in an event.

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

let config = {
  apiBaseUrl: "https://www.anyloc.io",
  appVersion: "?",
  getAccessToken: () => null,
  dataDir: null,
};
let installId = null;
// Polling steps (USB, trust, Windows) repeat every few seconds: one event per key.
const sentOnce = new Set();

function configureAnalytics(next) {
  config = { ...config, ...next };
}

// Random id kept with the app data: the same install across launches.
function getInstallId() {
  if (installId) return installId;
  const file = config.dataDir ? path.join(config.dataDir, "install-id") : null;
  try {
    const saved = file && fs.readFileSync(file, "utf8").trim();
    if (saved && /^[0-9a-f-]{36}$/i.test(saved)) return (installId = saved);
  } catch {}
  installId = crypto.randomUUID();
  try {
    if (file) fs.writeFileSync(file, installId);
  } catch {}
  return installId;
}

/** `onceKey` sends the event only the first time per app session for that key. */
function trackEvent(event, properties = {}, onceKey = null) {
  if (onceKey !== null) {
    const key = `${event}:${onceKey}`;
    if (sentOnce.has(key)) return;
    sentOnce.add(key);
  }

  const token = config.getAccessToken();
  fetch(`${config.apiBaseUrl.replace(/\/$/, "")}/api/app-event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      event,
      install_id: getInstallId(),
      app_version: config.appVersion,
      properties: {
        os: process.platform === "win32" ? "windows" : process.platform === "darwin" ? "mac" : process.platform,
        os_version: os.release(),
        arch: process.arch,
        ...properties,
      },
    }),
  }).catch(() => {});
}

module.exports = { configureAnalytics, trackEvent };
