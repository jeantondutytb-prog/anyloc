const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const PYTHON_VERSION = "3.12.7";
const PYTHON_TAG = "312";
const WIN_EMBED_URL = `https://www.python.org/ftp/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-embed-amd64.zip`;
const GET_PIP_URL = "https://bootstrap.pypa.io/get-pip.py";

function isWin() {
  return process.platform === "win32";
}

function getEnvDir() {
  try {
    const { app } = require("electron");
    return path.join(app.getPath("userData"), "python-env");
  } catch {
    return path.join(os.homedir(), ".anyloc", "python-env");
  }
}

function getBundledPython() {
  const dir = getEnvDir();
  if (isWin()) {
    const root = path.join(dir, "python.exe");
    if (fs.existsSync(root)) return root;
    return path.join(dir, "Scripts", "python.exe");
  }
  return path.join(dir, "bin", "python3");
}

function getBundledCli() {
  const dir = getEnvDir();
  if (isWin()) {
    return path.join(dir, "Scripts", "pymobiledevice3.exe");
  }
  return path.join(dir, "bin", "pymobiledevice3");
}

function isBundleReady() {
  return fs.existsSync(getBundledCli());
}

function findSystemPython() {
  const candidates = isWin()
    ? ["py", "python3", "python"]
    : [
        "/opt/homebrew/bin/python3",
        "/usr/local/bin/python3",
        "/Library/Frameworks/Python.framework/Versions/Current/bin/python3",
        "python3",
      ];

  for (const cmd of candidates) {
    try {
      const r = spawnSync(cmd, ["--version"], {
        timeout: 4000,
        windowsHide: true,
        stdio: "pipe",
      });
      if (r.status === 0) {
        const ver = (r.stdout || "").toString();
        if (/Python 3\.\d+/.test(ver)) return cmd;
      }
    } catch {}
  }
  return null;
}

function spawnAsync(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true, stdio: "pipe", ...opts });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d; });
    child.stderr?.on("data", (d) => { stderr += d; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.on("error", reject);
  });
}

async function downloadFile(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": "anyloc-setup" } });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
}

async function setupWindowsEmbed(envDir, onProgress) {
  const zipPath = path.join(os.tmpdir(), `python-embed-${Date.now()}.zip`);

  onProgress?.({ pct: 10, message: "Téléchargement de Python..." });
  await downloadFile(WIN_EMBED_URL, zipPath);

  onProgress?.({ pct: 30, message: "Extraction..." });
  fs.mkdirSync(envDir, { recursive: true });
  const ps = await spawnAsync("powershell", [
    "-NoProfile", "-Command",
    `Expand-Archive -Path '${zipPath}' -DestinationPath '${envDir}' -Force`,
  ], { timeout: 120_000 });
  if (ps.code !== 0) throw new Error("Extraction failed");

  const pthFile = path.join(envDir, `python${PYTHON_TAG}._pth`);
  if (fs.existsSync(pthFile)) {
    let txt = fs.readFileSync(pthFile, "utf8");
    txt = txt.replace(/^#\s*import site/m, "import site");
    fs.writeFileSync(pthFile, txt);
  }

  onProgress?.({ pct: 40, message: "Installation de pip..." });
  const getPipPath = path.join(os.tmpdir(), `get-pip-${Date.now()}.py`);
  await downloadFile(GET_PIP_URL, getPipPath);
  const pythonExe = path.join(envDir, "python.exe");
  const pip = await spawnAsync(pythonExe, [getPipPath, "--no-warn-script-location"], {
    cwd: envDir,
    timeout: 180_000,
  });
  if (pip.code !== 0) throw new Error(`pip setup failed: ${pip.stderr.slice(0, 300)}`);

  try { fs.unlinkSync(zipPath); } catch {}
  try { fs.unlinkSync(getPipPath); } catch {}
}

async function createVenv(python, envDir, onProgress) {
  onProgress?.({ pct: 15, message: "Création de l'environnement Python..." });
  fs.mkdirSync(path.dirname(envDir), { recursive: true });

  let r = await spawnAsync(python, ["-m", "venv", envDir], { timeout: 120_000 });
  if (r.code === 0) return;

  r = await spawnAsync(python, ["-m", "venv", "--without-pip", envDir], { timeout: 120_000 });
  if (r.code !== 0) throw new Error(`venv failed: ${r.stderr.slice(0, 300)}`);

  onProgress?.({ pct: 25, message: "Installation de pip..." });
  const getPipPath = path.join(os.tmpdir(), `get-pip-${Date.now()}.py`);
  await downloadFile(GET_PIP_URL, getPipPath);
  const venvPython = isWin()
    ? path.join(envDir, "Scripts", "python.exe")
    : path.join(envDir, "bin", "python3");
  await spawnAsync(venvPython, [getPipPath], { timeout: 180_000 });
  try { fs.unlinkSync(getPipPath); } catch {}
}

async function installPmd3(envDir, onProgress) {
  onProgress?.({ pct: 50, message: "Installation de pymobiledevice3..." });

  const rootPython = path.join(envDir, "python.exe");
  const venvPython = isWin()
    ? path.join(envDir, "Scripts", "python.exe")
    : path.join(envDir, "bin", "python3");

  const pythonExe = fs.existsSync(rootPython) ? rootPython : venvPython;

  const r = await spawnAsync(pythonExe, [
    "-m", "pip", "install", "pymobiledevice3", "--no-warn-script-location",
  ], { timeout: 600_000 });

  if (r.code !== 0) throw new Error(`pymobiledevice3 install failed: ${r.stderr.slice(0, 400)}`);

  onProgress?.({ pct: 95, message: "Vérification..." });
}

async function ensurePymobiledevice3(onProgress) {
  if (isBundleReady()) {
    onProgress?.({ pct: 100, message: "Outils USB prêts" });
    return { ok: true, source: "cached" };
  }

  const envDir = getEnvDir();

  try {
    if (fs.existsSync(envDir)) {
      fs.rmSync(envDir, { recursive: true, force: true });
    }

    const sysPython = findSystemPython();

    if (sysPython) {
      await createVenv(sysPython, envDir, onProgress);
    } else if (isWin()) {
      await setupWindowsEmbed(envDir, onProgress);
    } else {
      return {
        ok: false,
        message:
          "Python 3 introuvable. Installe-le via python.org ou Homebrew (brew install python3), puis relance Anyloc.",
      };
    }

    await installPmd3(envDir, onProgress);

    if (!isBundleReady()) {
      throw new Error("pymobiledevice3 CLI not found after install");
    }

    onProgress?.({ pct: 100, message: "Outils USB prêts !" });
    return { ok: true, source: "auto-installed" };
  } catch (err) {
    try { fs.rmSync(envDir, { recursive: true, force: true }); } catch {}
    return { ok: false, message: err.message };
  }
}

module.exports = {
  getEnvDir,
  getBundledPython,
  getBundledCli,
  isBundleReady,
  ensurePymobiledevice3,
};
