#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SETUP_DIR="$ROOT/apps/setup"
DIST_DIR="$ROOT/dist/setup"

mkdir -p "$DIST_DIR"

cd "$SETUP_DIR"

if [[ ! -d node_modules ]]; then
  npm install
fi

case "$(uname -s)" in
  Darwin)
    echo "→ Build Anyloc Setup (macOS .dmg)"
    CSC_IDENTITY_AUTO_DISCOVERY=false npm run build:mac
    cp -f dist/Anyloc-Setup.dmg "$DIST_DIR/Anyloc-Setup.dmg"
    echo "✓ $DIST_DIR/Anyloc-Setup.dmg"
    ;;
  MINGW*|MSYS*|CYGWIN*|Windows*)
    echo "→ Build Anyloc Setup (Windows .exe)"
    CSC_IDENTITY_AUTO_DISCOVERY=false npm run build:win
    cp -f dist/Anyloc-Setup.exe "$DIST_DIR/Anyloc-Setup.exe"
    echo "✓ $DIST_DIR/Anyloc-Setup.exe"
    ;;
  Linux)
    echo "→ Build Anyloc Setup (Windows .zip — pour test local uniquement)"
    CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win zip --config.win.signAndEditExecutable=false
    cp -f dist/Anyloc-Setup.zip "$DIST_DIR/Anyloc-Setup.zip"
    echo "✓ $DIST_DIR/Anyloc-Setup.zip"
    echo "⚠ Sur Linux, utilise GitHub Actions pour générer le .exe NSIS et le .dmg Mac."
    ;;
  *)
    echo "Plateforme non supportée: $(uname -s)"
    exit 1
    ;;
esac
