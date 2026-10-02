// Windows only: detect an iPhone that Windows sees but that lacks Apple's
// USB driver (usbaapl64). That happens when Apple Devices / iTunes come from
// the Microsoft Store and Windows Update never delivers the driver: the
// iPhone shows up as a photo device only and usbmux never lists it.

const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");

const ITUNES_DOWNLOAD_URL = "https://www.apple.com/itunes/download/win64";
const CHECK_CACHE_MS = 15000;

let cached = null;

function driverInfPath() {
  const base = process.env.CommonProgramFiles || "C:\\Program Files\\Common Files";
  return path.join(base, "Apple", "Mobile Device Support", "Drivers", "usbaapl64.inf");
}

function runPowerShell(script, timeoutMs = 15000) {
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      // Encoded so quotes in the script survive Windows argument parsing.
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")],
      { windowsHide: true, timeout: timeoutMs },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          code: error ? error.code : 0,
          stdout: String(stdout || ""),
          stderr: String(stderr || error?.message || ""),
        });
      },
    );
  });
}

// Apple vendor id is 05AC; iPhones/iPads enumerate with product ids 12xx.
async function listAppleUsbEntities() {
  const result = await runPowerShell(
    "Get-CimInstance Win32_PnPEntity -Filter \"PNPDeviceID LIKE 'USB\\\\VID_05AC&PID_12%'\" | " +
      "Select-Object Name, PNPDeviceID, Service | ConvertTo-Json -Compress",
  );
  if (!result.ok) return null;
  const raw = result.stdout.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return null;
  }
}

// Returns { status: "ok" | "missing" | "absent" | "unknown", infAvailable }.
async function checkAppleDriver({ force = false } = {}) {
  if (process.platform !== "win32") return { status: "ok", infAvailable: false };
  if (!force && cached && Date.now() - cached.at < CHECK_CACHE_MS) return cached.value;

  const entities = await listAppleUsbEntities();
  let status;
  if (entities === null) status = "unknown";
  else if (!entities.length) status = "absent";
  else if (entities.some((e) => /^usbaapl/i.test(String(e.Service || "")))) status = "ok";
  else status = "missing";

  const value = { status, infAvailable: fs.existsSync(driverInfPath()) };
  cached = { at: Date.now(), value };
  return value;
}

// Installs the driver shipped by iTunes (apple.com version) with pnputil.
// Needs admin rights, so Windows shows a UAC prompt.
async function installAppleDriver() {
  if (process.platform !== "win32") return { ok: false, message: "Windows uniquement." };
  const inf = driverInfPath();
  if (!fs.existsSync(inf)) {
    return {
      ok: false,
      needsItunes: true,
      message: "Pilote Apple introuvable. Installe iTunes depuis apple.com (pas le Microsoft Store), puis réessaie.",
    };
  }

  const escaped = inf.replace(/'/g, "''");
  const result = await runPowerShell(
    "$p = Start-Process -FilePath pnputil.exe " +
      `-ArgumentList '/add-driver', '"${escaped}"', '/install' ` +
      "-Verb RunAs -WindowStyle Hidden -Wait -PassThru; exit $p.ExitCode",
    120000,
  );
  cached = null;

  // pnputil exits with 3010 when the driver is installed but wants a reboot,
  // and 259 when it was already in place.
  if (!result.ok && result.code !== 3010 && result.code !== 259) {
    const cancelled = /annul|cancel/i.test(result.stderr);
    return {
      ok: false,
      message: cancelled
        ? "Installation annulée. Clique sur « Oui » quand Windows demande l'autorisation."
        : "L'installation du pilote a échoué. Débranche l'iPhone, rebranche-le et réessaie.",
    };
  }
  return { ok: true, message: "Pilote Apple installé. Débranche et rebranche l'iPhone." };
}

module.exports = { ITUNES_DOWNLOAD_URL, checkAppleDriver, installAppleDriver };
