#!/bin/bash
# Anyloc — Installer automatique pour macOS
# Double-clique ce fichier pour installer et ouvrir Anyloc.

APP_NAME="Anyloc.app"
DEST="/Applications/$APP_NAME"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE="$SCRIPT_DIR/$APP_NAME"

if [ ! -d "$SOURCE" ]; then
  echo "❌ $APP_NAME introuvable dans le DMG. Glisse-le dans Applications manuellement."
  exit 1
fi

echo "→ Copie de $APP_NAME dans Applications..."
cp -R "$SOURCE" "$DEST" 2>/dev/null || {
  echo "→ Mise à jour de $APP_NAME..."
  rm -rf "$DEST"
  cp -R "$SOURCE" "$DEST"
}

echo "→ Déblocage de l'app..."
xattr -cr "$DEST" 2>/dev/null

echo "→ Ouverture d'Anyloc..."
open "$DEST"

echo "✅ C'est bon ! Tu peux fermer cette fenêtre."
