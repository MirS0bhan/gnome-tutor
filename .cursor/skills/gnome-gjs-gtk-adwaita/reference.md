# GJS / GTK 4 / Libadwaita — Documentation Reference

## Primary documentation sites

| Resource | URL | Use for |
|----------|-----|---------|
| GJS API docs (DevDocs) | https://gjs-docs.gnome.org/ | Gtk, Adw, Gio, GLib, GObject introspected APIs |
| GJS built-in modules | https://gjs-docs.gnome.org/gjs/ | `imports`, `system`, `format`, language bindings |
| GJS Guide | https://gjs.guide/ | Tutorials, GObject, GTK packaging, extensions |
| GTK4 + GJS Book | https://rmnvgr.gitlab.io/gtk4-gjs-book/ | End-to-end app tutorial (Meson, Flatpak, widgets) |
| GNOME Welcome / Programming | https://welcome.gnome.org/team/programming/ | Language entry points, community links |
| GTK 4 docs | https://docs.gtk.org/gtk4/ | Widget reference (C API, maps to GJS) |
| Libadwaita docs | https://gnome.pages.gitlab.gnome.org/libadwaita/doc/ | Adw widgets, adaptive layouts, styling |
| GLib docs | https://docs.gtk.org/glib/ | GSettings, variants, main loop |
| Gio docs | https://docs.gtk.org/gio/ | D-Bus, files, actions, application API |
| GObject docs | https://docs.gtk.org/gobject/ | Properties, signals, ParamSpec |
| GNOME Developer | https://developer.gnome.org/ | Platform overview, HIG, tooling |
| GJS GitHub README | https://github.com/GNOME/gjs/blob/master/doc/README.md | Ecosystem overview, app list |
| TypeScript @girs types | https://gjsify.github.io/docs/ | IDE types for gi:// imports |
| GJS application template | https://gitlab.gnome.org/GNOME/gjs/-/tree/master/examples/gtk4-application | Official minimal template |
| Application packaging spec | https://gjs.guide/guides/gtk/application-packaging.html | Meson layout, pkg API, GResource paths |
| Workbench | https://gitlab.gnome.org/Workbench/Workbench | Live GJS/GTK/CSS sandbox |

## GJS Guide — key sections

| Topic | URL |
|-------|-----|
| GObject basics | https://gjs.guide/guides/gobject/basics.html |
| GObject subclassing | https://gjs.guide/guides/gobject/subclassing.html |
| GObject cheatsheet | https://gjs.guide/guides/gobject/cheatsheet.html |
| GTK application packaging | https://gjs.guide/guides/gtk/application-packaging.html |
| Shell extensions | https://gjs.guide/extensions/ |
| Extension development | https://gjs.guide/extensions/development/ |

## Libadwaita — commonly used classes

| Class | Doc path | Notes |
|-------|----------|-------|
| Adw.Application | `class.Application.html` | Base app class; style + recoloring |
| Adw.ApplicationWindow | `class.ApplicationWindow.html` | Primary window |
| Adw.HeaderBar | `class.HeaderBar.html` | Title bar |
| Adw.ToolbarView | `class.ToolbarView.html` | Header + content layout |
| Adw.NavigationSplitView | `class.NavigationSplitView.html` | Sidebar/content split |
| Adw.NavigationView | `class.NavigationView.html` | Stack navigation when collapsed |
| Adw.NavigationPage | `class.NavigationPage.html` | Page in navigation |
| Adw.Toast / ToastOverlay | `class.Toast.html` | Brief notifications |
| Adw.StatusPage | `class.StatusPage.html` | Placeholder/error UI |
| Adw.AlertDialog | `class.AlertDialog.html` | Modal dialogs |
| Adw.AboutDialog | `class.AboutDialog.html` | About window |
| Adw.StyleManager | `class.StyleManager.html` | Dark/light preference |
| Adw.Breakpoint | `class.Breakpoint.html` | Responsive layout breakpoints |
| Adw.WindowTitle | `class.WindowTitle.html` | Title + subtitle widget |

Base URL: `https://gnome.pages.gitlab.gnome.org/libadwaita/doc/latest/`

## GTK 4 — commonly used classes

| Class | Notes |
|-------|-------|
| Gtk.Box, Gtk.Grid | Layout |
| Gtk.ScrolledWindow | Scrollable areas |
| Gtk.Button, Gtk.Label | Basic widgets |
| Gtk.MenuButton | Menu from Gio.Menu |
| Gtk.Builder | Load `.ui` from GResource |
| Gtk.Application / Window | Use Adw variants in GNOME apps |
| Gtk.ShortcutsWindow | Keyboard shortcut overlay (`set_help_overlay`) |

## GJS `pkg` module API

Available after `imports.package.init({ name, version, prefix, ... })`:

| Member | Description |
|--------|-------------|
| `pkg.name`, `pkg.version` | Package metadata |
| `pkg.prefix`, `pkg.datadir`, `pkg.libdir` | Install paths |
| `pkg.pkgdatadir`, `pkg.moduledir` | App data / module dirs |
| `pkg.initGettext()` | Enables `_()`, `C_()`, `N_()` |
| `pkg.initFormat()` | Enables `String.prototype.format` |
| `pkg.loadResource(name)` | Load installed GResource bundle |
| `pkg.require(deps)` | Assert GI typelib versions |

## Meson GNOME module helpers

```meson
gnome = import('gnome')

gnome.compile_resources('bundle-name',
  'bundle.gresource.xml',
  gresource_bundle: true,
  install: true,
  install_dir: pkgdatadir,
)

gnome.post_install(
  glib_compile_schemas: true,
  gtk_update_icon_cache: true,
  update_desktop_database: true,
)
```

## Flatpak essentials

```yaml
app-id: ir.example.MyApp
runtime: org.gnome.Platform
runtime-version: '50'
sdk: org.gnome.Sdk
command: ir.example.MyApp
finish-args:
  - --socket=wayland
  - --socket=fallback-x11
  - --share=ipc
  - --device=dri
modules:
  - name: myapp
    buildsystem: meson
    sources:
      - type: dir
        path: .
```

Install runtime: `flatpak install org.gnome.Platform//50 org.gnome.Sdk//50`

## TypeScript / modern JS toolchain (optional)

| Tool | URL / command |
|------|---------------|
| @girs packages | `npm install @girs/gjs @girs/gtk-4.0 @girs/adw-1` |
| create-gtk | `npx create-gtk <project-name>` |
| esbuild GJS targets | firefox115 (GJS 1.77+), firefox102 (1.73+), firefox91 (1.71+) |
| GNOME TS template | https://github.com/sonnyp/gnome-typescript-template |

## Community and help

| Channel | URL |
|---------|-----|
| Matrix #javascript:gnome.org | https://matrix.to/#/#javascript:gnome.org |
| GNOME Discourse | https://discourse.gnome.org/ |
| GJS issues | https://gitlab.gnome.org/GNOME/gjs/issues |
| Stack Overflow tag | https://stackoverflow.com/questions/tagged/gjs |

## GJS version ↔ SpiderMonkey / ESM

GJS tracks Firefox ESR. Check `NEWS` in GJS repo for language feature additions. Use `gjs --version` to verify runtime. Flatpak manifest `runtime-version` must match installed Platform.

## GNOME HIG

- https://developer.gnome.org/hig/ — spacing, patterns, adaptive design
- Prefer Libadwaita widgets over raw Gtk when targeting GNOME
- Use symbolic icons (`*-symbolic`) in header bars
- Follow GNOME action naming (`app.*`, `win.*`)
