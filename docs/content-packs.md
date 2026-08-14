# Content pack layout and split repositories

## Installed layout

Meson installs packs under:

```
$prefix/share/gnome-tutor/content/
  core/
    pack.yaml
    filesystem/
    orientation/
    ...
  core-fa/
    pack.yaml
    ...
```

At runtime the app searches (in order):

1. `GNOME_TUTOR_CONTENT_DIR` environment variable
2. Flatpak path `/app/share/gnome-tutor/content`
3. `$datadir/gnome-tutor/content` from the installed prefix
4. `./content` relative to the working directory (development)

## Adding a pack in-tree

1. Create `content/my-pack/pack.yaml` with `id`, `title`, and `language`.
2. Add track subdirectories and YAML modules (see [authoring.md](authoring.md)).
3. Register the pack in `content/meson.build` with `install_subdir('my-pack', ...)`.
4. Run `gjs -m tools/content-lint.js content` before opening a PR.

## Split content repository (optional)

For large translations or community modules, publish a separate repository and install packs into the XDG data path:

```
~/.local/share/gnome-tutor/content/community/
  pack.yaml
  ...
```

Or system-wide:

```
/usr/share/gnome-tutor/content/community/
```

The app lists every directory under each content root that contains a `pack.yaml`. Learners switch packs from **Language pack** in the main menu. Progress is keyed by pack id in GSettings.

## Submodule workflow

To vendor an external content repo:

```bash
git submodule add https://github.com/example/gnome-tutor-content content/vendor
```

Add `install_subdir('vendor/core', install_dir: content_install_dir)` in `content/meson.build`, or symlink packs into `content/` before release tarballs.
