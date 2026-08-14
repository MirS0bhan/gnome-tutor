---
name: gnome-gjs-gtk-adwaita
description: Build GNOME desktop applications with GJS, GTK 4, and Libadwaita. Covers GObject subclassing, gi:// imports, Meson/GResource packaging, Flatpak, adaptive layouts, GSettings, D-Bus, and VTE. Use when creating or modifying GNOME apps, GJS modules, GTK widgets, Adwaita UI, Shell extensions, or when the user mentions gjs, gtk4, libadwaita, gnome builder, or flatpak.
---

# GNOME Apps with GJS, GTK 4, and Libadwaita

## Quick start

1. **Confirm stack**: GJS + GTK 4 + Libadwaita (not GTK 3). Pin versions in imports.
2. **Read official docs** before inventing APIs — see [reference.md](reference.md).
3. **Match project conventions** in this repo: ESM imports, `GObject.registerClass`, `Adw.Application`, Meson + GResource.
4. **Build and run** after substantive changes:

```bash
meson setup build
meson compile -C build
export GNOME_TUTOR_CONTENT_DIR="$PWD/content"   # if app needs content dir
./build/src/ir.urumlug.gnomeTutor
```

Flatpak (when manifest exists):

```bash
flatpak run org.flatpak.Builder --force-clean --user --install build-dir ir.urumlug.gnomeTutor.json
flatpak run ir.urumlug.gnomeTutor
```

## Core patterns

### Imports (always version-pin)

```javascript
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
```

Libraries load from `gi://` via GObject Introspection. When multiple versions exist (GTK 3 vs 4), always specify `?version=`.

### Application entry

- Extend `Adw.Application` (not `Gtk.Application`) for GNOME HIG compliance.
- Export `main(argv)` that returns `application.runAsync(argv)`.
- Use `pkg.initGettext()` / `pkg.initFormat()` for `_()` and `.format()`.
- Set `resource_base_path` to match GResource prefix (e.g. `/ir/urumlug/gnomeTutor`).

### GObject subclassing

Use `GObject.registerClass` with `constructor(constructProperties)` (GJS ≥ 1.72 / GNOME 42+). Do **not** use legacy `_init()`.

```javascript
export const MyWidget = GObject.registerClass({
    GTypeName: 'MyWidget',
    Signals: { 'clicked': {} },
    Properties: {
        'label': GObject.ParamSpec.string(
            'label', 'Label', 'Text',
            GObject.ParamFlags.READWRITE, null),
    },
}, class MyWidget extends Gtk.Box {
    constructor(params = {}) {
        super({ orientation: Gtk.Orientation.VERTICAL, ...params });
    }
});
```

- Declare signals in `Signals`; emit with `this.emit('clicked')`.
- Declare properties in `Properties`; call `this.notify('label')` after changes.
- Connect signals: `widget.connect('clicked', () => { ... })`.

### Libadwaita layout (modern GNOME app shell)

Typical window structure:

```
Adw.ApplicationWindow
  └─ Adw.ToastOverlay
       └─ Adw.ToolbarView (+ Adw.HeaderBar)
            └─ Adw.NavigationSplitView (sidebar + content)
```

Key widgets:

| Widget | Use |
|--------|-----|
| `Adw.HeaderBar` | Title bar; use `set_title_widget(Adw.WindowTitle)` |
| `Adw.ToolbarView` | Hosts header bar + content |
| `Adw.NavigationSplitView` | Sidebar/content; set `min/max_sidebar_width`, `sidebar_width_fraction` |
| `Adw.NavigationPage` | Pages inside split view (`sidebar`, `content` properties) |
| `Adw.ToastOverlay` | Toast notifications via `add_toast(Adw.Toast.new(...))` |
| `Adw.StatusPage` | Empty/error states |
| `Adw.AlertDialog` | Confirmation dialogs (`present(parent)`) |
| `Adw.AboutDialog` | About window |
| `Gtk.MenuButton` + `Gio.Menu` | App menu from `Gio.SimpleAction` |

For adaptive collapse on narrow widths, pair `Adw.NavigationSplitView` with `Adw.Breakpoint` (see Libadwaita docs).

### Actions and menus

```javascript
const action = new Gio.SimpleAction({ name: 'quit' });
action.connect('activate', () => this.quit());
this.add_action(action);
this.set_accels_for_action('app.quit', ['<primary>q']);
```

Window-scoped actions use `win.*` prefix; app-scoped use `app.*`. Reference in menus: `'app.about'`, `'win.reset-module'`.

### GResource and GtkBuilder

- JS modules: compiled to `${entry-point}.src.gresource` at `resource://<path>/js/`.
- UI/CSS/icons: `${entry-point}.data.gresource`.
- Load UI: `Gtk.Builder.new_from_resource('/ir/urumlug/gnomeTutor/gtk/help-overlay.ui')`.
- Entry script loads build-tree resources when uninstalled, then imports `resource://.../js/main.js`.

### Internationalization

- Wrap user strings in `_('...')` after `pkg.initGettext()`.
- Use `_('Step %1$d of %2$d').format(a, b)` for parameterized strings.
- Translation domain = package name from `imports.package.init`.

## Packaging (Meson)

Follow the [GJS application packaging spec](https://gjs.guide/guides/gtk/application-packaging.html):

| Path | Purpose |
|------|---------|
| `src/` | JS modules + `.src.gresource.xml` |
| `data/` | desktop file, schemas, `.data.gresource.xml`, icons |
| `po/` | gettext translations |
| `src/<app-id>.in` | Shebang entry: `#!@GJS@ -m` + `imports.package.init` + dynamic import |
| `meson.build` | `gnome.compile_resources`, `configure_file` for entry point |

Entry shebang must use `@GJS@` substitution from Meson `find_program('gjs')`. Use `-m` for ESM.

`gnome.post_install` should run `glib_compile_schemas`, `gtk_update_icon_cache`, `update_desktop_database`.

## Flatpak

- Runtime: `org.gnome.Platform` + matching `org.gnome.Sdk` version.
- `command` = installed binary name (app ID).
- Typical `finish-args`: `--socket=wayland`, `--socket=fallback-x11`, `--share=ipc`, `--device=dri`.
- Add `--talk-name=` for D-Bus services the app uses.
- Build with `buildsystem: meson` in manifest modules.

## Debugging

| Problem | Check |
|---------|-------|
| `Unknown option -m` | Wrong GJS in Flatpak — verify `@GJS@` substitution and runtime version |
| Module not found | GResource path, `resource_base_path`, build-tree `.gresource` registration |
| Widget not styled | Libadwaita loaded? Use `Adw.Application` / `Adw.StyleManager` |
| Property not updating | Missing `this.notify('prop-name')` in setter |
| Signal not firing | Signal declared in `Signals` dict? Correct name? |

Run with `G_MESSAGES_DEBUG=all` for GLib logging. Use `console.log` / `console.error` — no Node.js `require`.

## GJS language notes

- **ESM only** in modern apps: `import` / `export`, `gjs -m`.
- **No Node.js APIs**: no `require`, `fs`, `process` (except `system` module: `programArgs`, `exit`).
- **Async**: `await import()`, `application.runAsync()`, Gio async via callbacks or `Gio._promisify`.
- **SpiderMonkey ESM target**: match esbuild `target` to GJS Firefox ESR version if using TypeScript.

## When to consult reference

- Widget API details → [gjs-docs.gnome.org](https://gjs-docs.gnome.org/) (Gtk, Adw, Gio, GLib)
- GObject patterns → [gjs.guide GObject guides](https://gjs.guide/guides/gobject/)
- Full walkthrough → [GTK4 + GJS Book](https://rmnvgr.gitlab.io/gtk4-gjs-book/)
- TypeScript types → `@girs/*` packages on [gjsify.github.io/docs](https://gjsify.github.io/docs/)
- Libadwaita widget reference → [libadwaita docs](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/)

## Additional resources

- Canonical code patterns: [examples.md](examples.md)
- Full doc link index: [reference.md](reference.md)
