#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$ROOT/apps/ios"
DIST_DIR="$IOS_DIR/dist"
ARCHIVE_PATH="$IOS_DIR/build/Anyloc.xcarchive"
EXPORT_DIR="$IOS_DIR/build/export"
EXPORT_OPTIONS="$IOS_DIR/build/ExportOptions.plist"
BUNDLE_ID="io.anyloc.app"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Le build iOS nécessite macOS + Xcode."
  exit 1
fi

if [[ -z "${APPLE_DEVELOPMENT_TEAM:-}" ]]; then
  echo "APPLE_DEVELOPMENT_TEAM manquant."
  echo "Exporte ton Team ID Apple (10 caractères) puis relance :"
  echo "  export APPLE_DEVELOPMENT_TEAM=XXXXXXXXXX"
  exit 1
fi

mkdir -p "$DIST_DIR" "$IOS_DIR/build"

cd "$IOS_DIR"

if command -v xcodegen >/dev/null 2>&1; then
  xcodegen generate
else
  echo "xcodegen introuvable — brew install xcodegen"
  exit 1
fi

cp "$IOS_DIR/ExportOptions.plist" "$EXPORT_OPTIONS"
/usr/libexec/PlistBuddy -c "Delete :teamID" "$EXPORT_OPTIONS" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :teamID string $APPLE_DEVELOPMENT_TEAM" "$EXPORT_OPTIONS"

if [[ -n "${KEYCHAIN_PATH:-}" && -n "${KEYCHAIN_PASSWORD:-}" ]]; then
  security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
fi

IS_CI=0
if [[ -n "${PROVISIONING_PROFILE_UUID:-}" ]]; then
  IS_CI=1
fi

if [[ "$IS_CI" == "1" ]]; then
  echo "→ Mode CI (signature automatique avec profil pré-installé)"
  # Free Personal Team profiles are Xcode-managed — use automatic signing
  # The profile is already installed by the CI setup step
  /usr/libexec/PlistBuddy -c "Delete :signingStyle" "$EXPORT_OPTIONS" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c "Delete :provisioningProfiles" "$EXPORT_OPTIONS" 2>/dev/null || true

  ARCHIVE_SIGN_ARGS=(
    CODE_SIGN_STYLE=Automatic
    CODE_SIGN_IDENTITY="Apple Development"
    DEVELOPMENT_TEAM="$APPLE_DEVELOPMENT_TEAM"
  )
else
  echo "→ Mode signature automatique (Mac local)"
  ARCHIVE_SIGN_ARGS=(
    CODE_SIGN_STYLE=Automatic
    DEVELOPMENT_TEAM="$APPLE_DEVELOPMENT_TEAM"
  )
fi

echo "→ Archive Anyloc (Release)"
xcodebuild \
  -project Anyloc.xcodeproj \
  -scheme Anyloc \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  archive \
  "${ARCHIVE_SIGN_ARGS[@]}"

rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"

echo "→ Export IPA (development)"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_OPTIONS"

IPA=$(find "$EXPORT_DIR" -maxdepth 1 -name "*.ipa" | head -n 1)

if [[ -z "$IPA" ]]; then
  echo "IPA introuvable après export."
  exit 1
fi

cp -f "$IPA" "$DIST_DIR/Anyloc.ipa"
echo "✓ $DIST_DIR/Anyloc.ipa"
