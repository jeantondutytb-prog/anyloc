#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/apps/android"
OUTPUT_DIR="$ROOT_DIR/dist/android"

cd "$ANDROID_DIR"

if [[ ! -f gradlew ]]; then
  echo "Gradle wrapper manquant. Lance depuis Android Studio ou génère-le avec Gradle 8.9+."
  exit 1
fi

chmod +x gradlew
./gradlew assembleRelease

mkdir -p "$OUTPUT_DIR"
APK_PATH="$(find app/build/outputs/apk/release -name '*.apk' | head -n 1)"

if [[ -z "$APK_PATH" ]]; then
  echo "APK release introuvable."
  exit 1
fi

cp "$APK_PATH" "$OUTPUT_DIR/Anyloc.apk"
echo "APK copié vers $OUTPUT_DIR/Anyloc.apk"
