# Spotlight Shell Extension (Phase 3)

Thin GNOME Shell extension that renders the lesson spotlight overlay for GNOME Linux Academy.

## Install

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/linux-academy-spotlight@urumlug.ir
cp extension/metadata.json extension/extension.js ~/.local/share/gnome-shell/extensions/linux-academy-spotlight@urumlug.ir/
gnome-extensions enable linux-academy-spotlight@urumlug.ir
```

Log out and back in (or restart Shell) after installing.

## D-Bus API

Bus name: `systems.misano.LinuxAcademy.Spotlight`

| Method | Purpose |
|---|---|
| `Highlight(x, y, w, h, label)` | Dim screen and highlight a rectangle |
| `HighlightWindow(wm_class, label)` | Highlight a window by WM class |
| `Clear()` | Remove overlay |

The main app degrades gracefully when this extension is absent — the floating instruction card still works.
