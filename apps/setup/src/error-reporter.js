// Sends app errors to anyloc.io (/api/app-error), where they land in PostHog on
// the logged-in user: console output never leaves the customer's computer.
// Never put the email or coordinates in a report.

const os = require("node:os");

// The spoof and USB loops retry every few seconds: one report per scope is enough.
const MIN_INTERVAL_MS = 5 * 60 * 1000;
const RECENT_LIMIT = 30;

const lastSent = new Map();
const recent = [];
let config = { apiBaseUrl: "https://www.anyloc.io", appVersion: "?", getAccessToken: () => null };

function configureErrorReporter(next) {
  config = { ...config, ...next };
}

function reportError(scope, error, context = {}) {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "").trim();
  if (!message) return;

  console.error(`[${scope}]`, message);
  recent.push({ at: new Date().toISOString(), scope, message: message.slice(0, 500) });
  if (recent.length > RECENT_LIMIT) recent.shift();

  const now = Date.now();
  if (now - (lastSent.get(scope) || 0) < MIN_INTERVAL_MS) return;
  lastSent.set(scope, now);

  const token = config.getAccessToken();
  fetch(`${config.apiBaseUrl.replace(/\/$/, "")}/api/app-error`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      platform: "desktop",
      scope,
      message: message.slice(0, 2000),
      app_version: config.appVersion,
      context: {
        os: `${process.platform} ${os.release()} ${process.arch}`,
        ...context,
      },
    }),
  }).catch(() => {});
}

/** Last errors of this session, for "Copier le diagnostic". */
function getRecentErrors() {
  return [...recent];
}

module.exports = { configureErrorReporter, reportError, getRecentErrors };
