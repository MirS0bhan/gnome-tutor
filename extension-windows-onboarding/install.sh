#!/usr/bin/env bash
# Install the Windows → GNOME coach-mark Shell extension.
set -euo pipefail
UUID="windows-onboarding@urumlug.ir"
DEST="${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions/$UUID"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$DEST/schemas"
cp "$SCRIPT_DIR/metadata.json" \
   "$SCRIPT_DIR/extension.js" \
   "$SCRIPT_DIR/prefs.js" \
   "$SCRIPT_DIR/hints.js" \
   "$SCRIPT_DIR/coachMark.js" \
   "$SCRIPT_DIR/triggers.js" \
   "$SCRIPT_DIR/stylesheet.css" \
   "$DEST/"
cp "$SCRIPT_DIR/schemas/"*.xml "$DEST/schemas/"
glib-compile-schemas "$DEST/schemas"

if command -v msgfmt >/dev/null 2>&1 && [[ -f "$SCRIPT_DIR/po/fa.po" ]]; then
  mkdir -p "$DEST/locale/fa/LC_MESSAGES"
  msgfmt "$SCRIPT_DIR/po/fa.po" -o "$DEST/locale/fa/LC_MESSAGES/windows-onboarding.mo"
elif [[ -d "$SCRIPT_DIR/locale" ]]; then
  cp -a "$SCRIPT_DIR/locale" "$DEST/"
fi

echo "Installed to $DEST"
echo "Enable with: gnome-extensions enable $UUID"
echo "Then restart GNOME Shell (log out/in, or Alt+F2 → r on X11)."
