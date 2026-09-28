#!/usr/bin/env bash
# Re-signe une IPA avec un profil ad hoc et le certificat Apple Distribution du trousseau.
# Usage: resign-ios-adhoc.sh <in.ipa> <profile.mobileprovision> <out.ipa>
set -euo pipefail

IN_IPA="$1"
PROFILE="$2"
OUT_IPA="$(cd "$(dirname "$3")" && pwd)/$(basename "$3")"
IDENTITY="${IOS_SIGN_IDENTITY:-Apple Distribution}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

unzip -q "$IN_IPA" -d "$WORK"
APP="$(find "$WORK/Payload" -maxdepth 1 -name '*.app' | head -1)"

if [[ -z "$APP" ]]; then
  echo "Aucun .app dans $IN_IPA" >&2
  exit 1
fi

security cms -D -i "$PROFILE" > "$WORK/profile.plist"
/usr/libexec/PlistBuddy -x -c "Print :Entitlements" "$WORK/profile.plist" > "$WORK/entitlements.plist"

cp "$PROFILE" "$APP/embedded.mobileprovision"
rm -rf "$APP/_CodeSignature"

if [[ -d "$APP/Frameworks" ]]; then
  find "$APP/Frameworks" -maxdepth 1 \( -name '*.framework' -o -name '*.dylib' \) -print0 |
    while IFS= read -r -d '' framework; do
      codesign --force --sign "$IDENTITY" --timestamp=none "$framework" >&2
    done
fi

codesign --force --sign "$IDENTITY" --entitlements "$WORK/entitlements.plist" --timestamp=none "$APP" >&2
codesign --verify --deep --strict "$APP" >&2

rm -f "$OUT_IPA"
(cd "$WORK" && zip -qry "$OUT_IPA" Payload)

/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$APP/Info.plist"
