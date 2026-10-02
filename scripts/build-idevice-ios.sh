#!/usr/bin/env bash
# Builds the idevice Rust library (https://github.com/jkcoxson/idevice) for
# iPhone, so the app can drive its own location simulation through LocalDevVPN
# without a computer. Output: apps/ios/Vendor/IDevice.xcframework (device +
# simulator, so the simulator UI previews still link).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$ROOT/apps/ios"
SRC_DIR="$IOS_DIR/build/idevice-src"
VENDOR_DIR="$IOS_DIR/Vendor"
OUT="$VENDOR_DIR/IDevice.xcframework"
IDEVICE_REPO="https://github.com/jkcoxson/idevice.git"
IDEVICE_COMMIT="d32c8189c51c2789496b0768039419c3705498c3"
FEATURES="ring,tcp,tunnel_tcp_stack,dvt,location_simulation,mobile_image_mounter,tss"

if [[ -d "$OUT" && -f "$VENDOR_DIR/.idevice-commit" && "$(cat "$VENDOR_DIR/.idevice-commit")" == "$IDEVICE_COMMIT" ]]; then
  echo "✓ idevice déjà compilé ($IDEVICE_COMMIT)"
  exit 0
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "Rust introuvable — installe-le : https://rustup.rs"
  exit 1
fi
rustup target add aarch64-apple-ios aarch64-apple-ios-sim >/dev/null

if [[ ! -d "$SRC_DIR/.git" ]]; then
  git clone "$IDEVICE_REPO" "$SRC_DIR"
fi
git -C "$SRC_DIR" fetch --depth 1 origin "$IDEVICE_COMMIT"
git -C "$SRC_DIR" checkout --quiet "$IDEVICE_COMMIT"

build() {
  local target="$1" sdk="$2"
  echo "→ Build idevice ($target)"
  (
    cd "$SRC_DIR/ffi"
    BINDGEN_EXTRA_CLANG_ARGS="--sysroot=$(xcrun --sdk "$sdk" --show-sdk-path)" \
      IPHONEOS_DEPLOYMENT_TARGET=17.0 \
      cargo build --release --target "$target" --no-default-features --features "$FEATURES"
  )
}
build aarch64-apple-ios iphoneos
build aarch64-apple-ios-sim iphonesimulator

HEADERS="$SRC_DIR/build-headers"
rm -rf "$HEADERS" "$OUT"
mkdir -p "$HEADERS" "$VENDOR_DIR"
cp "$SRC_DIR/ffi/idevice.h" "$HEADERS/"
printf 'module IDevice {\n  header "idevice.h"\n  export *\n}\n' > "$HEADERS/module.modulemap"

xcodebuild -create-xcframework \
  -library "$SRC_DIR/target/aarch64-apple-ios/release/libidevice_ffi.a" -headers "$HEADERS" \
  -library "$SRC_DIR/target/aarch64-apple-ios-sim/release/libidevice_ffi.a" -headers "$HEADERS" \
  -output "$OUT" >/dev/null
echo "$IDEVICE_COMMIT" > "$VENDOR_DIR/.idevice-commit"
echo "✓ $OUT"
