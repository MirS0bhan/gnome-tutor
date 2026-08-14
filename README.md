# GNOME Linux Academy

Learn Linux the way you will actually use it — with real **Files**, **Settings**, **Software**, and a sandboxed terminal.

Each module follows four beats: **contrast** (Windows vs Linux), **GUI practice**, **terminal practice**, and a **bridge** step tying them together.

## Build

```bash
meson setup build --prefix=/usr
meson compile -C build
meson install -C build
```

Run from the source tree (content packs load from `./content`):

```bash
GNOME_TUTOR_CONTENT_DIR=$PWD/content gjs -m src/main.js
```

## Content validation

```bash
gjs -m tools/content-lint.js content
```

## Optional Shell extension

The spotlight overlay is optional. Install with:

```bash
./extension/install.sh
gnome-extensions enable linux-academy-spotlight@urumlug.ir
```

See [extension/README.md](extension/README.md) for the D-Bus API.

## Flatpak

```bash
flatpak-builder --user --install build-dir ir.urumlug.gnomeTutor.json
flatpak run ir.urumlug.gnomeTutor
```

## Authoring

See [docs/authoring.md](docs/authoring.md) for YAML module templates. Content packs can live in this repo or under `$XDG_DATA_DIRS/gnome-tutor/content/` as described in [docs/content-packs.md](docs/content-packs.md).

## License

GPL-3.0-or-later — see [COPYING](COPYING).
