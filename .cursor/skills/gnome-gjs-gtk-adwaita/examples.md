# GJS / GTK 4 / Libadwaita — Code Examples

## Minimal Adw.Application

```javascript
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Adw from 'gi://Adw?version=1';

export const MyApplication = GObject.registerClass(
    class MyApplication extends Adw.Application {
        constructor() {
            super({
                application_id: 'ir.example.MyApp',
                flags: Gio.ApplicationFlags.DEFAULT_FLAGS,
            });
        }

        vfunc_activate() {
            const win = new Adw.ApplicationWindow({ application: this });
            win.set_default_size(400, 300);
            win.present();
        }
    }
);

export function main(argv) {
    const app = new MyApplication();
    return app.runAsync(argv);
}
```

## Entry point (Meson `.in` template)

```javascript
#!@GJS@ -m

import Gio from 'gi://Gio';
import { exit, programArgs, programInvocationName } from 'system';

imports.package.init({
    name: '@PACKAGE_NAME@',
    version: '@PACKAGE_VERSION@',
    prefix: '@prefix@',
    libdir: '@libdir@',
    datadir: '@datadir@',
});

// Load build-tree GResources when running uninstalled
const BUILD_RESOURCES = [
    '@build_root@/src/myapp.src.gresource',
    '@build_root@/src/myapp.data.gresource',
];
for (const path of BUILD_RESOURCES) {
    const file = Gio.File.new_for_path(path);
    if (file.query_exists(null))
        Gio.Resource.load(file.get_path())._register();
}

const { main } = await import('resource://@resource_path@/js/main.js');
exit(await main([programInvocationName, ...programArgs]));
```

## Navigation split view shell

```javascript
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';

const splitView = new Adw.NavigationSplitView({
    vexpand: true,
    hexpand: true,
    min_sidebar_width: 220,
    max_sidebar_width: 400,
    sidebar_width_fraction: 0.28,
});

const sidebarScroll = new Gtk.ScrolledWindow({
    vexpand: true,
    hscrollbar_policy: Gtk.PolicyType.NEVER,
    min_content_width: 220,
});
sidebarScroll.set_child(sidebarWidget);

splitView.sidebar = new Adw.NavigationPage({
    title: _('Sidebar'),
    child: sidebarScroll,
});
splitView.content = new Adw.NavigationPage({
    title: _('Content'),
    child: contentWidget,
});

const header = new Adw.HeaderBar();
header.set_title_widget(new Adw.WindowTitle({
    title: _('My App'),
    subtitle: _('Subtitle'),
}));

const toolbar = new Adw.ToolbarView();
toolbar.add_top_bar(header);
toolbar.set_content(splitView);

const toastOverlay = new Adw.ToastOverlay({ vexpand: true });
toastOverlay.set_child(toolbar);
window.set_content(toastOverlay);

// Show toast
toastOverlay.add_toast(Adw.Toast.new(_('Done!')));
```

## Custom widget with signals

```javascript
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk?version=4.0';

export const MySidebar = GObject.registerClass({
    GTypeName: 'MySidebar',
    Signals: {
        'item-selected': {},
    },
}, class MySidebar extends Gtk.Box {
    constructor(params = {}) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            ...params,
        });
    }

    _onItemActivated() {
        this.emit('item-selected');
    }
});

// Usage
const sidebar = new MySidebar();
sidebar.connect('item-selected', () => {
    console.log('selected');
});
```

## Gio.Menu + actions

```javascript
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';

const menu = Gio.Menu.new();
const section = Gio.Menu.new();
section.append(_('About'), 'app.about');
section.append(_('Quit'), 'app.quit');
menu.append_section(null, section);

const menuButton = new Gtk.MenuButton({
    icon_name: 'open-menu-symbolic',
    primary: true,
    menu_model: menu,
});
header.pack_end(menuButton);
```

## Alert dialog

```javascript
const dialog = Adw.AlertDialog.new(
    _('Delete file?'),
    _('This cannot be undone.'),
);
dialog.add_response('cancel', _('Cancel'));
dialog.add_response('delete', _('Delete'));
dialog.set_response_appearance('delete', Adw.ResponseAppearance.DESTRUCTIVE);
dialog.set_default_response('cancel');
dialog.connect('response', (_d, response) => {
    if (response === 'delete')
        doDelete();
});
dialog.present(parentWindow);
```

## GtkBuilder from GResource

```javascript
const builder = Gtk.Builder.new_from_resource('/ir/urumlug/gnomeTutor/gtk/help-overlay.ui');
const helpOverlay = builder.get_object('help_overlay');
if (helpOverlay)
    window.set_help_overlay(helpOverlay);
```

## GResource XML (JS modules)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gresources>
  <gresource prefix="/ir/urumlug/gnomeTutor">
    <file>js/main.js</file>
    <file>js/window.js</file>
    <file>js/widgets/myWidget.js</file>
  </gresource>
</gresources>
```

Import path: `resource://ir/urumlug/gnomeTutor/js/main.js`

## GSettings

```javascript
import Gio from 'gi://Gio';

const settings = new Gio.Settings({ schema_id: 'ir.urumlug.gnomeTutor' });
const value = settings.get_boolean('some-key');
settings.set_string('another-key', 'value');
settings.connect('changed::some-key', () => { /* react */ });
```

Schema installed via `data/*.gschema.xml` + `gnome.post_install(glib_compile_schemas: true)`.

## D-Bus client (Gio)

```javascript
import Gio from 'gi://Gio';

const proxy = Gio.DBusProxy.new_sync(
    Gio.DBus.session,
    Gio.DBusProxyFlags.NONE,
    null,
    'org.example.Service',
    '/org/example/Service',
    'org.example.Service',
    null,
);
proxy.call_sync('MethodName', new GLib.Variant('(s)', ['arg']), Gio.DBusCallFlags.NONE, -1, null);
```

Add `--talk-name=org.example.Service` to Flatpak `finish-args`.

## Launch external app

```javascript
import Gio from 'gi://Gio';

Gio.Subprocess.new(
    ['nautilus', path],
    Gio.SubprocessFlags.NONE,
);
// or
Gio.AppInfo.launch_default_for_uri_async(uri, null, null, null);
```

## VTE terminal widget

```javascript
import Vte from 'gi://Vte?version=3.91';

const term = new Vte.Terminal();
term.spawn_async(
    Vte.PtyFlags.DEFAULT,
    null,           // working directory
    ['bash'],       // argv
    [],             // env
    GLib.SpawnFlags.SEARCH_PATH,
    null, null, -1,
    null,
    () => {},
);
```

Requires Vte typelib and Flatpak permission if spawning shells.

## Meson src/meson.build pattern

```meson
pkgdatadir = get_option('datadir') / meson.project_name()
gnome = import('gnome')

src_res = gnome.compile_resources('myapp.src',
  'myapp.src.gresource.xml',
  gresource_bundle: true,
  install: true,
  install_dir: pkgdatadir,
)

bin_conf = configuration_data()
bin_conf.set('GJS', find_program('gjs').full_path())
bin_conf.set('PACKAGE_VERSION', meson.project_version())
bin_conf.set('PACKAGE_NAME', meson.project_name())
bin_conf.set('prefix', get_option('prefix'))
bin_conf.set('libdir', get_option('prefix') / get_option('libdir'))
bin_conf.set('datadir', get_option('prefix') / get_option('datadir'))
bin_conf.set('resource_path', '/ir/example/myapp')
bin_conf.set('build_root', meson.project_build_root())

configure_file(
  input: 'ir.example.myapp.in',
  output: 'ir.example.myapp',
  configuration: bin_conf,
  install: true,
  install_dir: get_option('bindir'),
)
```

## Shell extension (minimal)

```javascript
import GObject from 'gi://GObject';
import St from 'gi://St';

export default class Extension {
    enable() {
        console.log('enabled');
    }

    disable() {
        console.log('disabled');
    }
}
```

Extension docs: https://gjs.guide/extensions/
