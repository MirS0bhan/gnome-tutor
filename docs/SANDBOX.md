# Lesson sandbox

GNOME Linux Academy provisions per-step practice folders by copying YAML **fixtures** into an app-specific cache directory:

- Flatpak: `~/.var/app/ir.urumlug.gnomeTutor/cache/lessons/`
- Native dev: `~/.cache/gnome-tutor/lessons/`

The same path is used for Nautilus GUI beats and the VTE terminal working directory.

## bwrap spike (Phase 1)

Bubblewrap (`bwrap`) namespace isolation was evaluated for stronger separation inside Flatpak. Nesting `bwrap` inside the Flatpak sandbox requires extra permissions and is fragile across distros.

**Current MVP:** copy-only sandbox under the app cache (no access to the learner's real home contents).

**Future:** optional `GNOME_TUTOR_USE_BWRAP=1` when running outside Flatpak with `bwrap` on PATH, binding only the lesson directory.
