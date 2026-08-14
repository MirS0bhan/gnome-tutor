# Documented deviations from spec / HIG defaults

Each entry explains a non-standard widget or policy choice for Phase 0 + Phase 1.

## Sidebar track progress — `Gtk.ProgressBar` instead of circular ring

Libadwaita has no circular progress indicator ([GNOME/libadwaita#1021](https://gitlab.gnome.org/GNOME/libadwaita/-/work_items/1021)). A vertical `Gtk.ProgressBar` plus percent/done text provides the same information with full AT-SPI coverage.

## Windows onboarding is a sibling extension

Coach-marks for Windows switchers live in `windows-onboarding@urumlug.ir`, not inside the lesson Spotlight extension. Mixing them would fire first-session hints during GUI lessons (or require D-Bus in a contrast coach that must stay local-only). Spotlight yield is by watching `systems.misano.LinuxAcademy.Spotlight`.

Renaming to match app ID `ir.urumlug.gnomeTutor` would break installed Shell extensions. The interface XML in [data/dbus/systems.misano.LinuxAcademy.Spotlight.xml](../data/dbus/systems.misano.LinuxAcademy.Spotlight.xml) is the shared contract; renaming is deferred to a coordinated release.

## bwrap inside Flatpak

The brief requires bwrap for sandboxed terminal beats. The Flatpak manifest bundles bubblewrap and enables bwrap by default when on PATH. On hosts where nested bwrap fails, `GNOME_TUTOR_USE_BWRAP=0` falls back to copy-only fixtures under the app cache (no host `$HOME` as cwd for sandboxed steps). This is an explicit, documented exception—not silent omission.

## Persian curriculum breadth

Phase 0/1 ships the gettext pipeline and installs the `core-fa` sample pack. Full translation of all 19 modules is Phase 5 scope; RTL layout is verified on contrast columns and sidebar via [localeUtils.js](../src/engine/localeUtils.js).

## GSettings progress store

SQLite migration remains on the roadmap (README Phase 5+). GSettings is sufficient for Phase 0/1 completion tracking and matches the existing implementation.

## ESLint without eslint-plugin-gjs

The upstream `eslint-plugin-gjs` package is unmaintained and fails to load against current ESLint releases (missing `eslint/lib/ast-utils`). CI uses ESLint 8 with `eslint:recommended` plus GJS style rules (semicolons, single quotes) and documents this gap here until a maintained GJS plugin exists.
