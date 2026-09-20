#!/usr/bin/env bash
set -euo pipefail

# Run on a Mac where Xcode is signed in with your Apple ID (free Personal Team OK).
# Exports the files needed for GitHub Actions iOS signing.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${1:-$ROOT/.ios-ci-secrets}"
IOS_DIR="$ROOT/apps/ios"
BUNDLE_ID="io.anyloc.app"
TEAM_ID="${APPLE_DEVELOPMENT_TEAM:-U284BGAVKL}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Ce script doit être lancé sur macOS."
  exit 1
fi

mkdir -p "$OUT_DIR"

find_profile() {
  find "$HOME/Library/MobileDevice/Provisioning Profiles" -name "*.mobileprovision" -print0 2>/dev/null \
    | xargs -0 grep -l "$BUNDLE_ID" 2>/dev/null | head -n 1 || true
}

echo "→ Recherche du certificat Apple Development dans le trousseau..."
CERT_SHA=$(security find-identity -v -p codesigning login.keychain-db 2>/dev/null \
  | awk -F'"' '/Apple Development/ {print $2; exit}')

if [[ -z "$CERT_SHA" ]]; then
  echo "Certificat Apple Development introuvable."
  echo "Ouvre Xcode → Settings → Accounts → ton compte → Manage Certificates → + Apple Development"
  exit 1
fi

echo "   Trouvé : $CERT_SHA"

P12_PATH="$OUT_DIR/anyloc-signing.p12"
read -rsp "Mot de passe pour chiffrer le .p12 (note-le pour GitHub BUILD_CERTIFICATE_PASSWORD) : " P12_PASSWORD
echo
read -rsp "Confirme : " P12_PASSWORD_CONFIRM
echo

if [[ "$P12_PASSWORD" != "$P12_PASSWORD_CONFIRM" ]]; then
  echo "Les mots de passe ne correspondent pas."
  exit 1
fi

security export -k login.keychain-db -t identities -f pkcs12 -P "$P12_PASSWORD" -o "$P12_PATH" "$CERT_SHA"

echo "→ Export provisioning profile $BUNDLE_ID..."
PROFILE_PATH="$OUT_DIR/anyloc.mobileprovision"
PROFILE_SRC=$(find_profile)

if [[ -z "$PROFILE_SRC" ]]; then
  echo "   Profil absent — génération via xcodebuild (une fois)..."
  if ! command -v xcodegen >/dev/null 2>&1; then
    echo "Installe xcodegen : brew install xcodegen"
    exit 1
  fi
  cd "$IOS_DIR"
  xcodegen generate
  xcodebuild \
    -project Anyloc.xcodeproj \
    -scheme Anyloc \
    -configuration Release \
    -destination "generic/platform=iOS" \
    -allowProvisioningUpdates \
    CODE_SIGN_STYLE=Automatic \
    DEVELOPMENT_TEAM="$TEAM_ID" \
    build
  cd "$ROOT"
  PROFILE_SRC=$(find_profile)
fi

if [[ -z "$PROFILE_SRC" ]]; then
  echo "Profil $BUNDLE_ID introuvable."
  echo "Ouvre apps/ios/Anyloc.xcodeproj dans Xcode, sélectionne ton Team, puis Product → Build."
  exit 1
fi

cp "$PROFILE_SRC" "$PROFILE_PATH"
echo "   Copié : $PROFILE_SRC"

B64_CERT="$OUT_DIR/BUILD_CERTIFICATE_BASE64.txt"
B64_PROFILE="$OUT_DIR/BUILD_PROVISION_PROFILE_BASE64.txt"
base64 -i "$P12_PATH" | tr -d '\n' > "$B64_CERT"
base64 -i "$PROFILE_PATH" | tr -d '\n' > "$B64_PROFILE"

echo
echo "✓ Fichiers générés dans $OUT_DIR"
echo
echo "Ajoute ces secrets GitHub (Settings → Secrets → Actions) :"
echo "  BUILD_CERTIFICATE_BASE64          ← $B64_CERT"
echo "  BUILD_CERTIFICATE_PASSWORD        ← mot de passe du .p12 choisi ci-dessus"
echo "  BUILD_PROVISION_PROFILE_BASE64    ← $B64_PROFILE"
echo "  APPLE_DEVELOPMENT_TEAM            ← $TEAM_ID"
