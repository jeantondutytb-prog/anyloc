// Windows only. pymobiledevice3 reaches the iPhone through Apple's usbmux
// service (Apple Mobile Device Service, TCP 127.0.0.1:27015) and Apple's USB
// driver (usbaapl64). A fresh Windows has neither: they come with iTunes or
// Apple Devices. diagnoseWindows() says which piece is missing and
// repairWindows() installs Apple's own "Apple Mobile Device Support" (no
// iTunes) behind a single Windows permission prompt.

const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");

// Official installer, downloaded from Apple at repair time (never bundled).
const ITUNES_SETUP_URL = "https://www.apple.com/itunes/download/win64";
const USBMUX_PORT = 27015;
const CHECK_CACHE_MS = 15000;

let cached = null;

function driverInfPath() {
  const base = process.env.CommonProgramFiles || "C:\\Program Files\\Common Files";
  return path.join(base, "Apple", "Mobile Device Support", "Drivers", "usbaapl64.inf");
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
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

function isUsbmuxUp() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: USBMUX_PORT });
    const done = (up) => {
      socket.destroy();
      resolve(up);
    };
    socket.setTimeout(1500, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

// Apple vendor id is 05AC; iPhones/iPads enumerate with product ids 12xx.
const PROBE_SCRIPT = `
$svc = Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'Apple Mobile Device*' } | Select-Object -First 1
$devices = @(Get-CimInstance Win32_PnPEntity -Filter "PNPDeviceID LIKE 'USB\\\\VID_05AC&PID_12%'" | Select-Object Name, PNPDeviceID, Service)
@{ service = $(if ($svc) { [string]$svc.Status } else { 'None' }); devices = $devices } | ConvertTo-Json -Compress -Depth 4
`;

async function probe() {
  const result = await runPowerShell(PROBE_SCRIPT);
  if (!result.ok) return null;
  try {
    const parsed = JSON.parse(result.stdout.trim());
    const devices = parsed.devices == null ? [] : [].concat(parsed.devices);
    return { service: String(parsed.service || "None"), devices };
  } catch {
    return null;
  }
}

// stage, in the order the customer fixes them:
//   "apple-missing"   no Apple Mobile Device Service on this PC
//   "service-stopped" the service exists but does not answer
//   "driver-missing"  Windows sees the iPhone with the photo driver only
//   "no-device"       Windows does not see any iPhone on USB (cable, port)
//   "ok"              everything is in place on the Windows side
//   "unknown"         PowerShell could not run (locked-down PC)
async function diagnoseWindows({ force = false } = {}) {
  if (process.platform !== "win32") return { stage: "ok" };
  if (!force && cached && Date.now() - cached.at < CHECK_CACHE_MS) return cached.value;

  const [usbmuxUp, info] = await Promise.all([isUsbmuxUp(), probe()]);
  const infAvailable = fs.existsSync(driverInfPath());
  const value = { usbmuxUp, infAvailable, service: info?.service ?? null, devices: info?.devices ?? null };

  if (!info) value.stage = usbmuxUp ? "ok" : "unknown";
  else if (!usbmuxUp && info.service === "None") value.stage = "apple-missing";
  else if (!usbmuxUp) value.stage = "service-stopped";
  else if (!info.devices.length) value.stage = "no-device";
  else if (!info.devices.some((d) => /^usbaapl/i.test(String(d.Service || "")))) value.stage = "driver-missing";
  else value.stage = "ok";

  cached = { at: Date.now(), value };
  return value;
}

async function download(url, dest, onProgress) {
  const res = await fetch(url, { headers: { "User-Agent": "Anyloc" } });
  if (!res.ok || !res.body) throw new Error(`download ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  const out = fs.createWriteStream(dest);
  let received = 0;
  try {
    for await (const chunk of res.body) {
      received += chunk.length;
      if (!out.write(chunk)) await new Promise((r) => out.once("drain", r));
      if (total) onProgress?.(received / total);
    }
  } finally {
    await new Promise((r) => out.end(r));
  }
}

// Downloads Apple's installer, checks Apple's signature and pulls out the
// Apple Mobile Device Support package (service + USB driver, no iTunes).
async function fetchMobileDeviceSupport(workDir, onProgress) {
  const setupExe = path.join(workDir, "iTunes64Setup.exe");
  await download(ITUNES_SETUP_URL, setupExe, (f) =>
    onProgress?.({ pct: 5 + Math.round(f * 65), message: "Téléchargement des composants Apple…" }),
  );

  onProgress?.({ pct: 72, message: "Vérification…" });
  const sig = await runPowerShell(
    `$s = Get-AuthenticodeSignature -LiteralPath ${psQuote(setupExe)}; ` +
      "if ($s.Status -eq 'Valid' -and $s.SignerCertificate.Subject -match 'O=Apple Inc\\.') { 'apple' }",
    30000,
  );
  if (!sig.stdout.includes("apple")) throw new Error("signature");

  onProgress?.({ pct: 78, message: "Préparation…" });
  // `/extract` drops the installer's MSI packages next to it.
  await new Promise((resolve) => {
    execFile(setupExe, ["/extract"], { cwd: workDir, windowsHide: true, timeout: 180000 }, () => resolve());
  });
  const msi = findFile(workDir, /^AppleMobileDeviceSupport64\.msi$/i);
  if (!msi) throw new Error("extract");
  return msi;
}

function findFile(dir, pattern) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && pattern.test(entry.name)) return full;
    if (entry.isDirectory()) {
      const found = findFile(full, pattern);
      if (found) return found;
    }
  }
  return null;
}

// Everything that needs admin rights, run in one elevated PowerShell so the
// customer answers a single Windows prompt.
function elevatedScript(msi) {
  return `
$code = 0
${msi ? `$p = Start-Process msiexec.exe -ArgumentList '/i', '"${msi.replace(/'/g, "''")}"', '/qn', '/norestart' -Wait -PassThru
if (@(0, 1638, 3010) -notcontains $p.ExitCode) { $code = 10 }` : ""}
$inf = ${psQuote(driverInfPath())}
if (Test-Path -LiteralPath $inf) { pnputil.exe /add-driver "$inf" /install | Out-Null }
$svc = Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'Apple Mobile Device*' } | Select-Object -First 1
if ($svc) {
  Set-Service -Name $svc.Name -StartupType Automatic -ErrorAction SilentlyContinue
  Start-Service -Name $svc.Name -ErrorAction SilentlyContinue
} elseif ($code -eq 0) { $code = 11 }
# Re-attach an iPhone already plugged in so it picks up the Apple driver.
Get-CimInstance Win32_PnPEntity -Filter "PNPDeviceID LIKE 'USB\\\\VID_05AC&PID_12%'" |
  Where-Object { $_.PNPDeviceID -notmatch '&MI_' } |
  ForEach-Object { pnputil.exe /restart-device "$($_.PNPDeviceID)" | Out-Null }
exit $code
`;
}

async function runElevated(scriptPath) {
  return runPowerShell(
    "try { $p = Start-Process -FilePath powershell.exe " +
      `-ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', '"${scriptPath.replace(/'/g, "''")}"' ` +
      "-Verb RunAs -WindowStyle Hidden -Wait -PassThru; exit $p.ExitCode } catch { Write-Error 'cancelled'; exit 1223 }",
    600000,
  );
}

const REPAIR_FAILED =
  "La préparation n'a pas abouti. Vérifie ta connexion internet et réessaie. Si ça bloque encore, clique sur « Copier le diagnostic » et envoie-le-nous sur le chat.";

// Installs / starts whatever diagnoseWindows() found missing.
async function repairWindows(onProgress) {
  if (process.platform !== "win32") return { ok: true };
  const before = await diagnoseWindows({ force: true });

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "anyloc-apple-"));
  try {
    const needsPackage =
      before.stage === "apple-missing" ||
      before.stage === "unknown" ||
      (before.stage === "driver-missing" && !before.infAvailable);

    let msi = null;
    if (needsPackage) {
      try {
        msi = await fetchMobileDeviceSupport(workDir, onProgress);
      } catch (error) {
        console.warn("[windows-apple]", error.message);
        return { ok: false, message: REPAIR_FAILED };
      }
    }

    onProgress?.({ pct: 85, message: "Clique sur « Oui » quand Windows demande l'autorisation…" });
    const scriptPath = path.join(workDir, "repair.ps1");
    fs.writeFileSync(scriptPath, elevatedScript(msi), "utf8");
    const result = await runElevated(scriptPath);
    cached = null;

    if (result.code === 1223 || /cancelled|annul/i.test(result.stderr)) {
      return {
        ok: false,
        message: "Windows n'a pas eu ton autorisation. Clique à nouveau et réponds « Oui » à la fenêtre de Windows.",
      };
    }

    onProgress?.({ pct: 95, message: "Démarrage…" });
    // The service takes a few seconds to listen after install.
    for (let i = 0; i < 10 && !(await isUsbmuxUp()); i++) {
      await new Promise((r) => setTimeout(r, 1000));
    }

    const after = await diagnoseWindows({ force: true });
    if (after.stage === "apple-missing" || after.stage === "service-stopped") {
      console.warn("[windows-apple] repair exit", result.code, result.stderr.slice(-300));
      return { ok: false, message: REPAIR_FAILED, diagnosis: after };
    }
    onProgress?.({ pct: 100, message: "Windows est prêt." });
    return { ok: true, diagnosis: after };
  } finally {
    fs.rm(workDir, { recursive: true, force: true }, () => {});
  }
}

module.exports = { diagnoseWindows, repairWindows };
