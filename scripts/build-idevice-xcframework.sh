#!/usr/bin/env bash
# Builds apps/ios/Vendor/IDevice.xcframework for on-device GPS simulation.
# Adapted from https://github.com/laatortuejaune/anole (MIT).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR_DIR="$ROOT/apps/ios/Vendor"
FRAMEWORK_PATH="$VENDOR_DIR/IDevice.xcframework"
REPO="https://github.com/jkcoxson/idevice.git"
WORK="${TMPDIR:-/tmp}/anyloc-idevice-build"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Le build IDevice.xcframework nécessite macOS + Xcode."
  exit 1
fi

if [[ -d "$FRAMEWORK_PATH" ]]; then
  echo "✓ $FRAMEWORK_PATH déjà présent — skip build."
  exit 0
fi

command -v cargo >/dev/null 2>&1 || {
  echo "cargo introuvable. Installe Rust : brew install rustup && rustup default stable"
  exit 1
}

echo "→ Fetch idevice"
rm -rf "$WORK"
git clone --depth 1 "$REPO" "$WORK"

echo "→ Add iOS target"
rustup target add aarch64-apple-ios

echo "→ Build libidevice_ffi for arm64 iOS (quelques minutes)"
cd "$WORK/ffi"
BINDGEN_EXTRA_CLANG_ARGS="--sysroot=$(xcrun --sdk iphoneos --show-sdk-path)" \
  IPHONEOS_DEPLOYMENT_TARGET=17.0 \
  cargo build --release --target aarch64-apple-ios

HEADERS="$WORK/headers"
mkdir -p "$HEADERS"
cp "$WORK/ffi/idevice.h" "$HEADERS/"
cp "$WORK/ffi/plist.h" "$HEADERS/" 2>/dev/null || true
cat > "$HEADERS/module.modulemap" <<'MODULEMAP'
module IDeviceFFI {
  header "idevice.h"
  export *
}
MODULEMAP

mkdir -p "$VENDOR_DIR"
rm -rf "$FRAMEWORK_PATH"

echo "→ Assemble xcframework"
xcodebuild -create-xcframework \
  -library "$WORK/target/aarch64-apple-ios/release/libidevice_ffi.a" \
  -headers "$HEADERS" \
  -output "$FRAMEWORK_PATH"

echo "✓ $FRAMEWORK_PATH"
