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

## Curriculum (Track 1 — Files)

Recommended order for new users:

1. **Opening Files (Nautilus)** — launch Files, use the sidebar, then `cd`
2. **Creating folders** — New Folder in the GUI, then `mkdir`
3. **Copying and pasting files** — Ctrl+C/V in Files, then `cp`

Each module uses the four-beat pattern: contrast → GUI → terminal → bridge.

## Spotlight extension

Yes — a GNOME Shell extension lives in `extension/`. It is **optional**; lessons work without it via the floating instruction card.

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/linux-academy-spotlight@urumlug.ir
cp extension/metadata.json extension/extension.js ~/.local/share/gnome-shell/extensions/linux-academy-spotlight@urumlug.ir/
gnome-extensions enable linux-academy-spotlight@urumlug.ir
```

Restart Shell or log out/in after enabling.

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
- [x] **Phase 4** — Curriculum Tracks 0–8 (four-beat pattern); Track 9 practice layer
- [ ] **Phase 5+** — Localization breadth, SSH practice stretch, SQLite progress

See [docs/CURRICULUM.md](docs/CURRICULUM.md) for track details.

## License

GPL-3.0-or-later
