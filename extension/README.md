# Spotlight Shell Extension (Phase 3)

Thin GNOME Shell extension that renders the lesson spotlight overlay.

The main app communicates with this extension over session D-Bus:

- Bus name: `systems.misano.LinuxAcademy.Spotlight`
- Methods:
  - `Highlight(x, y, w, h, label)` — highlight a screen region
  - `HighlightWindow(wm_class, label)` — highlight an entire window
  - `Clear()` — remove the overlay

If the extension is missing or disabled, the app falls back to the floating
instruction card only. The extension is never a hard dependency.

Implementation starts in Phase 3 of the roadmap.
