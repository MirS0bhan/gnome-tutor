#!/usr/bin/env bash
# Install the optional Linux Academy spotlight Shell extension.
set -euo pipefail
UUID="linux-academy-spotlight@urumlug.ir"
DEST="${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions/$UUID"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$DEST"
cp "$SCRIPT_DIR/metadata.json" "$SCRIPT_DIR/extension.js" "$DEST/"
echo "Installed to $DEST"
echo "Enable with: gnome-extensions enable $UUID"
echo "Then restart GNOME Shell (log out/in, or Alt+F2 → r on X11)."
