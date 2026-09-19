#!/usr/bin/env bash
set -euo pipefail

# Run on a Mac where Xcode is signed in with your Apple ID (free Personal Team OK).
# Exports the files needed for GitHub Actions iOS signing.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${1:-$ROOT/.ios-ci-secrets}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Ce script doit être lancé sur macOS."
  exit 1
fi

mkdir -p "$OUT_DIR"

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

echo "→ Export provisioning profile io.anyloc.app (si présent)..."
PROFILE_PATH="$OUT_DIR/anyloc.mobileprovision"
PROFILE_SRC=$(find "$HOME/Library/MobileDevice/Provisioning Profiles" -name "*.mobileprovision" -print0 2>/dev/null \
  | xargs -0 grep -l "io.anyloc.app" 2>/dev/null | head -n 1 || true)

if [[ -n "$PROFILE_SRC" ]]; then
  cp "$PROFILE_SRC" "$PROFILE_PATH"
  echo "   Copié : $PROFILE_SRC"
else
  echo "   Aucun profil io.anyloc.app — build une fois dans Xcode pour en générer un."
  PROFILE_PATH=""
fi

B64_CERT="$OUT_DIR/BUILD_CERTIFICATE_BASE64.txt"
base64 -i "$P12_PATH" | tr -d '\n' > "$B64_CERT"

echo
echo "✓ Fichiers générés dans $OUT_DIR"
echo
echo "Ajoute ces secrets GitHub (Settings → Secrets → Actions) :"
echo "  BUILD_CERTIFICATE_BASE64     ← contenu de $B64_CERT"
echo "  BUILD_CERTIFICATE_PASSWORD   ← mot de passe du .p12 choisi ci-dessus"
if [[ -n "$PROFILE_PATH" && -f "$PROFILE_PATH" ]]; then
  B64_PROFILE="$OUT_DIR/BUILD_PROVISION_PROFILE_BASE64.txt"
  base64 -i "$PROFILE_PATH" | tr -d '\n' > "$B64_PROFILE"
  echo "  BUILD_PROVISION_PROFILE_BASE64 ← contenu de $B64_PROFILE"
fi
echo
echo "Garde aussi APPLE_DEVELOPMENT_TEAM=9Y84R64D72"
echo "Tu peux retirer APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD une fois le certificat configuré."
