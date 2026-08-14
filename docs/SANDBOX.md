# Lesson sandbox

GNOME Linux Academy provisions per-step practice folders by copying YAML **fixtures** into an app-specific cache directory:

- Flatpak: `~/.var/app/ir.urumlug.gnomeTutor/cache/lessons/`
- Native dev: `~/.cache/gnome-tutor/lessons/`

The same path is used for Nautilus GUI beats and the VTE terminal working directory.

Each provisioned sandbox receives a `.bashrc` with the `__LA:` sentinel used for terminal validation (see curriculum spec §1.6).

## bwrap (default when available)

Bubblewrap (`bwrap`) namespace isolation is **enabled by default** when `bwrap` is on `PATH`. Only steps with `sandbox: false` in YAML (the package-manager install lesson) run on the real system.

Disable for local debugging:

```bash
export GNOME_TUTOR_USE_BWRAP=0
./build/src/ir.urumlug.gnomeTutor
```

When enabled, the terminal beat spawns a bwrap sandbox binding the lesson fixture as `/home/learner`.

**Default isolation:** copy-only fixture under the app cache plus optional bwrap — no access to the learner's real home contents during sandboxed steps.

**Flatpak note:** The Flatpak manifest bundles `bubblewrap` and builds VTE with accessibility enabled. Nested bwrap inside Flatpak was verified on GNOME Platform 50 using the bundled `bwrap` module. If a host runtime lacks usable nesting, set `GNOME_TUTOR_USE_BWRAP=0` and rely on the copy-only fixture boundary (documented in [DEVIATIONS.md](DEVIATIONS.md)).

**Exception:** Track 3 includes one `sandbox: false` terminal step that runs on the real system (banner shown in the lesson UI).
