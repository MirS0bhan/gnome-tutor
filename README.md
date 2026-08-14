# GNOME Linux Academy

A GNOME-native application (GJS + GTK4 + Libadwaita) that teaches newcomers how to use Linux by showing every concept twice: once in a real GUI app, once in a real terminal, with an explicit bridge between the two.

Companion Shell extension (Phase 3) adds optional spotlight highlighting during GUI lessons.

## Stack

| Component | Technology |
|---|---|
| Main app | GJS, GTK4, Libadwaita |
| Terminal (Phase 1) | VTE |
| Content | YAML lesson packs |
| Progress | GSettings (Phase 0), SQLite later |
| Spotlight | GJS Shell extension + D-Bus |
| Packaging | Flatpak |

## Project layout

```
src/           Application code
  engine/      Content loader, schema validation, progress store
  widgets/     Curriculum sidebar, step views
content/       Loadable content packs (YAML + fixtures)
extension/     Shell spotlight extension (Phase 3)
tools/         content-lint and other dev scripts
```

## Development

```bash
meson setup build
meson compile -C build
meson install -C build
ir.urumlug.gnomeTutor
```

Run from the build tree without installing:

```bash
export GNOME_TUTOR_CONTENT_DIR="$PWD/content"
./build/src/ir.urumlug.gnomeTutor
```

Validate lesson content:

```bash
gjs -m tools/content-lint.js content
```

## Roadmap status

- [x] **Phase 0** — App skeleton, navigation split view, YAML loader, schema validation, progress store
- [x] **Phase 1** — VTE terminal, sandbox fixtures, regex validation, tiered hints, reset button
- [x] **Phase 2** — GUI beat, Nautilus launcher, floating instruction card, self-reported Done
- [x] **Phase 3** — Spotlight Shell extension + D-Bus client (optional enhancement)
- [ ] **Phase 4+** — Curriculum breadth, practice layer, localization

## License

GPL-3.0-or-later
