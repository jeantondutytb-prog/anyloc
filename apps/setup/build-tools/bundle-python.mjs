#!/usr/bin/env node
// Builds the Python + pymobiledevice3 runtime shipped inside the installer, so
// customers never download Python or run pip on their machine (that step
// failed on slow networks, tripped antivirus heuristics, and on a Mac without
// Xcode tools popped up a "install developer tools" dialog).
//
//   node build-tools/bundle-python.mjs <arm64|x64>
//
// Output: python-dist/<arch>/python, picked up by electron-builder.config.js.
// Uses python-build-standalone (relocatable CPython), pinned and checksummed.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Must match PMD3_VERSION in src/python-setup.js.
const PMD3_VERSION = "10.10.3";
const RELEASE = "20241016";
const PYTHON = "3.12.7";

const BUILDS = {
  "darwin-arm64": {
    triple: "aarch64-apple-darwin",
    sha256: "4c18852bf9c1a11b56f21bcf0df1946f7e98ee43e9e4c0c5374b2b3765cf9508",
  },
  "darwin-x64": {
    triple: "x86_64-apple-darwin",
    sha256: "60c5271e7edc3c2ab47440b7abf4ed50fbc693880b474f74f05768f5b657045a",
  },
  "win32-x64": {
    triple: "x86_64-pc-windows-msvc",
    sha256: "f05531bff16fa77b53be0776587b97b466070e768e6d5920894de988bdcd547a",
  },
};

const arch = process.argv[2] || process.arch;
const key = `${process.platform}-${arch}`;
const build = BUILDS[key];
if (!build) {
  console.error(`No Python build for ${key}`);
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "python-dist", arch);
const pythonDir = path.join(outDir, "python");
const isWin = process.platform === "win32";
const pythonExe = isWin ? path.join(pythonDir, "python.exe") : path.join(pythonDir, "bin", "python3");

// x64 Python on an Apple Silicon runner goes through Rosetta.
function runPython(args, { capture = false } = {}) {
  const crossArch = process.platform === "darwin" && arch !== process.arch;
  const [cmd, cmdArgs] = crossArch
    ? ["arch", [`-${arch === "x64" ? "x86_64" : "arm64"}`, pythonExe, ...args]]
    : [pythonExe, args];
  const out = execFileSync(cmd, cmdArgs, { stdio: ["ignore", capture ? "pipe" : "inherit", "inherit"] });
  return capture ? out.toString().trim() : "";
}

async function download() {
  const name = `cpython-${PYTHON}+${RELEASE}-${build.triple}-install_only.tar.gz`;
  const url = `https://github.com/astral-sh/python-build-standalone/releases/download/${RELEASE}/${encodeURIComponent(name)}`;
  console.log(`Downloading ${name}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const hash = createHash("sha256").update(buf).digest("hex");
  if (hash !== build.sha256) throw new Error(`Checksum mismatch for ${name}: ${hash}`);
  const tarball = path.join(os.tmpdir(), name);
  fs.writeFileSync(tarball, buf);
  return tarball;
}

// Trims what the app never uses. Static archives also break macOS signing.
function prune() {
  const lib = isWin ? path.join(pythonDir, "Lib") : path.join(pythonDir, "lib", `python${PYTHON.split(".").slice(0, 2).join(".")}`);
  const drop = [
    path.join(lib, "test"),
    path.join(lib, "idlelib"),
    path.join(lib, "tkinter"),
    path.join(lib, "turtledemo"),
    path.join(lib, "ensurepip"),
    path.join(pythonDir, "include"),
    path.join(pythonDir, "share"),
    path.join(pythonDir, "tcl"),
  ];
  // Nothing is pip-installed on the customer's machine any more.
  drop.push(path.join(lib, "site-packages", "pip"));
  if (!isWin) {
    for (const entry of fs.readdirSync(lib)) {
      if (entry.startsWith("config-")) drop.push(path.join(lib, entry));
    }
  }
  for (const target of drop) fs.rmSync(target, { recursive: true, force: true });

  // Console-script launchers hardcode this build machine's path: the app
  // always runs `python -m pymobiledevice3` instead.
  const scriptsDir = isWin ? path.join(pythonDir, "Scripts") : path.join(pythonDir, "bin");
  for (const entry of fs.existsSync(scriptsDir) ? fs.readdirSync(scriptsDir) : []) {
    if (!/^python/i.test(entry)) fs.rmSync(path.join(scriptsDir, entry), { recursive: true, force: true });
  }
}

const tarball = await download();
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
execFileSync("tar", ["-xzf", tarball, "-C", outDir], { stdio: "inherit" });
fs.rmSync(tarball, { force: true });

console.log(`Installing pymobiledevice3 ${PMD3_VERSION}`);
runPython([
  "-m", "pip", "install", "--no-cache-dir", "--disable-pip-version-check", "--no-warn-script-location",
  // Older wheel over a source build: no compiler on the customer machine path.
  "--prefer-binary",
  `pymobiledevice3==${PMD3_VERSION}`,
  "--constraint", path.join(root, "build-tools", "python-constraints.txt"),
  ...(isWin ? ["pywin32"] : []),
]);

prune();

const installed = runPython(["-c", "import importlib.metadata as m, pymobiledevice3; print(m.version('pymobiledevice3'))"], { capture: true });
if (installed !== PMD3_VERSION) throw new Error(`Expected pymobiledevice3 ${PMD3_VERSION}, got ${installed}`);
console.log(`Bundled Python ${PYTHON} + pymobiledevice3 ${installed} in ${pythonDir}`);
