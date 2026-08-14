# Lesson sandbox

GNOME Linux Academy provisions per-step practice folders by copying YAML **fixtures** into an app-specific cache directory:

- Flatpak: `~/.var/app/ir.urumlug.gnomeTutor/cache/lessons/`
- Native dev: `~/.cache/gnome-tutor/lessons/`

The same path is used for Nautilus GUI beats and the VTE terminal working directory.

Each provisioned sandbox receives a `.bashrc` with the `__LA:` sentinel used for terminal validation (see curriculum spec §1.6).

## bwrap (optional)

Bubblewrap (`bwrap`) namespace isolation is **optional** and **off by default**, especially inside Flatpak where nesting is fragile.

Enable on native installs when `bwrap` is on PATH:

```bash
export GNOME_TUTOR_USE_BWRAP=1
./build/src/ir.urumlug.gnomeTutor
```

When enabled, the terminal beat spawns a bwrap sandbox binding the lesson fixture as `/home/learner`.

**Default (MVP):** copy-only sandbox under the app cache — no access to the learner's real home contents.

**Exception:** Track 3 includes one `sandbox: false` terminal step that runs on the real system (documented in the lesson UI).
